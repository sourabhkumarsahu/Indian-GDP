// This file will handle real-time data fetching from World Bank API
// Implementation for Phase 1

class WorldBankAPI {
    constructor() {
        this.baseUrl = 'https://api.worldbank.org/v2';
        this.cacheExpiration = 24 * 60 * 60 * 1000; // 24 hours
        this.cache = this.loadCache();
    }

    async fetchGDP(countryCode, startYear, endYear) {
        const cacheKey = `gdp_${countryCode}_${startYear}_${endYear}`;

        // Check if we have cached data that's still valid
        if (this.isCacheValid(cacheKey)) {
            console.log(`Using cached GDP data for ${countryCode}`);
            return this.cache[cacheKey].data;
        }

        console.log(`Fetching GDP data for ${countryCode} from ${startYear} to ${endYear}`);
        const endpoint = `${this.baseUrl}/country/${countryCode}/indicator/NY.GDP.MKTP.CD?format=json&date=${startYear}:${endYear}`;

        try {
            const response = await fetch(endpoint);
            if (!response.ok) throw new Error(`API error: ${response.status}`);

            const data = await response.json();

            // World Bank API returns data in reverse chronological order (most recent first)
            // and the first element is metadata, actual data is in the second element
            const gdpData = data[1].map(entry => ({
                year: parseInt(entry.date),
                value: entry.value ? entry.value / 1000000000000 : null // Convert to trillions
            })).filter(entry => entry.value !== null);

            // Cache the data
            this.updateCache(cacheKey, gdpData);

            return gdpData;
        } catch (error) {
            console.error('Error fetching GDP data:', error);
            throw error;
        }
    }

    async fetchMultipleCountriesGDP(countryCodes, startYear, endYear) {
        const promises = countryCodes.map(code => this.fetchGDP(code, startYear, endYear));
        const results = await Promise.allSettled(promises);

        const gdpData = {};

        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                gdpData[countryCodes[index]] = result.value;
            } else {
                console.error(`Failed to fetch data for ${countryCodes[index]}:`, result.reason);
                gdpData[countryCodes[index]] = [];
            }
        });

        return gdpData;
    }

    async fetchLatestGDP(countryCode) {
        const currentYear = new Date().getFullYear();
        // Fetch last 5 years of data to find the most recent available value
        const data = await this.fetchGDP(countryCode, currentYear-5, currentYear);

        // Return the most recent value (first non-null value)
        for (const entry of data) {
            if (entry.value !== null && entry.value !== undefined) {
                return {
                    year: entry.year,
                    gdp: entry.value
                };
            }
        }

        throw new Error(`No recent GDP data available for ${countryCode}`);
    }

    async fetchGrowthRate(countryCode, years = 5) {
        const currentYear = new Date().getFullYear();
        const startYear = currentYear - years - 1; // Extra year for calculating first year's growth

        // Fetch GDP data for the period
        const gdpData = await this.fetchGDP(countryCode, startYear, currentYear);

        if (!gdpData || gdpData.length < 2) {
            throw new Error(`Insufficient data to calculate growth rate for ${countryCode}`);
        }

        // Sort data by year in ascending order
        const sortedData = [...gdpData].sort((a, b) => a.year - b.year);

        // Calculate yearly growth rates
        const growthRates = [];
        for (let i = 1; i < sortedData.length; i++) {
            const previousValue = sortedData[i - 1].value;
            const currentValue = sortedData[i].value;

            if (previousValue && currentValue) {
                const growthRate = ((currentValue - previousValue) / previousValue) * 100;
                growthRates.push(growthRate);
            }
        }

        // Calculate average growth rate
        if (growthRates.length === 0) {
            throw new Error(`Could not calculate growth rates for ${countryCode}`);
        }

        const averageGrowth = growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length;

        return {
            countryCode,
            averageGrowthRate: averageGrowth,
            periodYears: years,
            yearlyRates: growthRates,
            dataYears: sortedData.map(d => d.year)
        };
    }

    async fetchCountryMetadata(countryCodes) {
        const cacheKey = `countries_metadata`;

        // Check cache first
        if (this.isCacheValid(cacheKey)) {
            return this.filterCountryMetadata(this.cache[cacheKey].data, countryCodes);
        }

        try {
            const endpoint = `${this.baseUrl}/country?format=json&per_page=300`;
            const response = await fetch(endpoint);
            if (!response.ok) throw new Error(`API error: ${response.status}`);

            const data = await response.json();
            const countries = data[1].map(country => ({
                id: country.id,
                code: country.iso2Code,
                name: country.name,
                region: country.region.value,
                incomeLevel: country.incomeLevel.value
            }));

            // Cache all countries metadata
            this.updateCache(cacheKey, countries);

            return this.filterCountryMetadata(countries, countryCodes);
        } catch (error) {
            console.error('Error fetching country metadata:', error);
            throw error;
        }
    }

    filterCountryMetadata(allCountries, countryCodes) {
        if (!countryCodes) return allCountries;
        return allCountries.filter(country => countryCodes.includes(country.id));
    }

    // Cache management functions
    isCacheValid(key) {
        return (
            this.cache &&
            this.cache[key] &&
            this.cache[key].timestamp &&
            Date.now() - this.cache[key].timestamp < this.cacheExpiration
        );
    }

    updateCache(key, data) {
        this.cache[key] = {
            timestamp: Date.now(),
            data: data
        };
        this.saveCache();
    }

    loadCache() {
        try {
            const cachedData = localStorage.getItem('worldbank_api_cache');
            return cachedData ? JSON.parse(cachedData) : {};
        } catch (e) {
            console.warn('Failed to load cache:', e);
            return {};
        }
    }

    saveCache() {
        try {
            localStorage.setItem('worldbank_api_cache', JSON.stringify(this.cache));
        } catch (e) {
            console.warn('Failed to save cache:', e);
        }
    }

    clearCache() {
        this.cache = {};
        localStorage.removeItem('worldbank_api_cache');
    }
}

// Export a singleton instance for use across the application
const worldBankAPI = new WorldBankAPI();
export default worldBankAPI;