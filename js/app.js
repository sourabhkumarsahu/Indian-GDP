const { createApp } = Vue;

createApp({
    data() {
        return {
            // Application state
            isLoading: true,
            errorMessage: null,
            showResults: false,
            dataLastUpdated: '',
            currentYear: new Date().getFullYear(),

            // Country selection
            availableCountries: [],
            selectedCountry: 'USA',

            // GDP and growth data
            countryData: {},
            indiaGDP: 0,
            indiaGrowthRate: 0,
            indiaPopulation: 0,
            indiaPerCapita: 0,
            indiaGlobalRank: 0,

            selectedCountryGDP: 0,
            selectedCountryGrowthRate: 0,
            selectedCountryPopulation: 0,
            selectedCountryPerCapita: 0,
            selectedCountryRank: 0,

            // Custom growth rates
            customIndiaGrowthRate: 0,
            customSelectedCountryGrowthRate: 0,

            // Projection results
            yearToSurpass: null,
            exactYearsToSurpass: 0,
            projectionYears: 100, // Extended from 30 to ensure we find intersection point

            // Required growth rate calculator
            targetCountryForRate: 'USA',
            yearsToSurpass: 20,
            requiredGrowthRate: 0,
            showRequiredRate: false,

            // Chart reference
            chart: null,

            // API tracking
            apiCallsInProgress: 0
        };
    },

    computed: {
        selectedCountryName() {
            const country = this.availableCountries.find(c => c.id === this.selectedCountry);
            return country ? country.name : '';
        },

        targetCountryForRateName() {
            const country = this.availableCountries.find(c => c.id === this.targetCountryForRate);
            return country ? country.name : '';
        },

        targetCountryGrowthRate() {
            if (!this.countryData || !this.targetCountryForRate) return 0;
            return this.countryData[this.targetCountryForRate]?.growthRate || 0;
        },

        gdpGap() {
            return Math.abs(this.selectedCountryGDP - this.indiaGDP);
        },

        gapPercentage() {
            if (this.indiaGDP === 0) return 0;
            return (this.gdpGap / this.indiaGDP) * 100;
        }
    },

    methods: {
        async fetchRealWorldBankData() {
            try {
                this.isLoading = true;
                this.errorMessage = null;

                // List of developed countries we want to include (ISO3 codes)
                const developedCountries = [
                    {id: 'USA', name: 'United States', code: 'US', rank: 1},
                    {id: 'CHN', name: 'China', code: 'CN', rank: 2},
                    {id: 'JPN', name: 'Japan', code: 'JP', rank: 3},
                    {id: 'DEU', name: 'Germany', code: 'DE', rank: 4},
                    {id: 'GBR', name: 'United Kingdom', code: 'GB', rank: 6},
                    {id: 'FRA', name: 'France', code: 'FR', rank: 7},
                    {id: 'ITA', name: 'Italy', code: 'IT', rank: 8},
                    {id: 'CAN', name: 'Canada', code: 'CA', rank: 9},
                    {id: 'KOR', name: 'Korea, Rep.', code: 'KR', rank: 13},
                    {id: 'AUS', name: 'Australia', code: 'AU', rank: 14}
                ];

                this.availableCountries = developedCountries;

                // Fetch GDP data for India and all comparison countries
                const countryIds = [...developedCountries.map(c => c.id), 'IND'];
                await this.fetchGDPDataForCountries(countryIds);

                // Update selected country data
                this.updateSelectedCountryData();

                // Set the last updated date
                this.dataLastUpdated = new Date().toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });

            } catch (error) {
                console.error('Error fetching data:', error);
                this.errorMessage = `Failed to load economic data: ${error.message}`;
            } finally {
                this.isLoading = false;

                // Wait until the UI has updated after loading is complete
                // before attempting to render the chart
                setTimeout(() => {
                    this.updateProjections();
                }, 200);
            }
        },

        async fetchGDPDataForCountries(countryIds) {
            this.apiCallsInProgress++;

            try {
                // For demo purposes, using simulated data with realistic values
                // In production, you would make actual API calls to World Bank

                // Corrected GDP data in trillions USD (current as of 2023)
                const simulatedGDPData = {
                    'USA': 26.95,
                    'CHN': 17.96,  // China's GDP ~17.96 trillion
                    'JPN': 4.41,
                    'DEU': 4.31,
                    'IND': 3.73,   // India's GDP ~3.73 trillion
                    'GBR': 3.33,
                    'FRA': 3.05,
                    'ITA': 2.19,
                    'CAN': 2.14,
                    'KOR': 1.71,
                    'AUS': 1.69
                };

                // Corrected growth rates (based on historical data)
                const simulatedGrowthRates = {
                    'USA': 2.2,
                    'CHN': 4.8,    // China growth ~4.8%
                    'JPN': 0.9,
                    'DEU': 1.1,
                    'IND': 6.7,    // India growth ~6.7%
                    'GBR': 2.0,
                    'FRA': 1.5,
                    'ITA': 0.8,
                    'CAN': 2.0,
                    'KOR': 2.4,
                    'AUS': 2.3
                };


                // Population data in millions
                const populationData = {
                    'USA': 333.29,
                    'CHN': 1412.36,
                    'JPN': 125.7,
                    'DEU': 83.2,
                    'IND': 1417.17,
                    'GBR': 67.53,
                    'FRA': 67.75,
                    'ITA': 58.85,
                    'CAN': 38.25,
                    'KOR': 51.74,
                    'AUS': 25.69
                };

                // Global ranks
                const rankData = {
                    'USA': 1,
                    'CHN': 2,
                    'JPN': 3,
                    'DEU': 4,
                    'IND': 5,
                    'GBR': 6,
                    'FRA': 7,
                    'ITA': 8,
                    'CAN': 9,
                    'KOR': 13,
                    'AUS': 14
                };

                // Process the data - in production, this would come from actual API calls
                this.countryData = {};
                for (const countryId of countryIds) {
                    if (simulatedGDPData[countryId] && simulatedGrowthRates[countryId]) {
                        // Calculate per capita GDP
                        const perCapita = (simulatedGDPData[countryId] * 1e12) / (populationData[countryId] * 1e6);

                        this.countryData[countryId] = {
                            gdp: simulatedGDPData[countryId],
                            growthRate: simulatedGrowthRates[countryId],
                            population: populationData[countryId],
                            perCapita: perCapita,
                            rank: rankData[countryId],
                            latestYear: 2023,
                            historicalData: []
                        };
                    }
                }

                // Set India's data
                if (this.countryData['IND']) {
                    this.indiaGDP = this.countryData['IND'].gdp;
                    this.indiaGrowthRate = this.countryData['IND'].growthRate;
                    this.indiaPopulation = this.countryData['IND'].population;
                    this.indiaPerCapita = this.countryData['IND'].perCapita;
                    this.indiaGlobalRank = this.countryData['IND'].rank;
                    this.customIndiaGrowthRate = this.countryData['IND'].growthRate;
                }
            } finally {
                this.apiCallsInProgress--;
            }
        },

        updateSelectedCountryData() {
            if (!this.countryData || !this.selectedCountry) return;

            const countryInfo = this.countryData[this.selectedCountry];
            if (countryInfo) {
                this.selectedCountryGDP = countryInfo.gdp;
                this.selectedCountryGrowthRate = countryInfo.growthRate;
                this.selectedCountryPopulation = countryInfo.population;
                this.selectedCountryPerCapita = countryInfo.perCapita;
                this.selectedCountryRank = countryInfo.rank;
                this.customSelectedCountryGrowthRate = countryInfo.growthRate;
            }
        },

        prepareProjectionData() {
            if (!this.indiaGDP || !this.selectedCountryGDP) return null;

            this.showResults = true;

            // Use actual growth rates for initial projection
            const indiaGrowthRate = this.indiaGrowthRate / 100;
            const targetGrowthRate = this.selectedCountryGrowthRate / 100;

            // Generate projection data
            const projectionData = this.generateProjectionData(
                this.indiaGDP,
                this.selectedCountryGDP,
                indiaGrowthRate,
                targetGrowthRate,
                this.projectionYears
            );

            // Find intersection year - always calculate to find years to surpass
            const crossoverYear = this.findYearsToSurpass(
                this.indiaGDP,
                this.selectedCountryGDP,
                indiaGrowthRate,
                targetGrowthRate
            );

            this.yearToSurpass = Math.ceil(crossoverYear);
            this.exactYearsToSurpass = crossoverYear;

            return projectionData;
        },

        updateProjections() {
            // Prepare data and find intersection year
            const projectionData = this.prepareProjectionData();
            if (!projectionData) return;

            // Render the chart with ApexCharts
            this.renderApexChart(projectionData);
        },

        recalculateWithCustomRates() {
            if (!this.indiaGDP || !this.selectedCountryGDP) return;

            this.showResults = true;

            // Use custom growth rates
            const indiaGrowthRate = this.customIndiaGrowthRate / 100;
            const targetGrowthRate = this.customSelectedCountryGrowthRate / 100;

            // Generate projection data
            const projectionData = this.generateProjectionData(
                this.indiaGDP,
                this.selectedCountryGDP,
                indiaGrowthRate,
                targetGrowthRate,
                this.projectionYears
            );

            // Calculate more accurate years to surpass
            const crossoverYear = this.findYearsToSurpass(
                this.indiaGDP,
                this.selectedCountryGDP,
                indiaGrowthRate,
                targetGrowthRate
            );

            this.yearToSurpass = Math.ceil(crossoverYear);
            this.exactYearsToSurpass = crossoverYear;

            // Update the chart
            this.renderApexChart(projectionData);
        },

        calculateRequiredRate() {
            if (!this.targetCountryForRate) return;

            this.showRequiredRate = true;

            // Get target country data
            const targetCountryData = this.countryData[this.targetCountryForRate];
            if (!targetCountryData) return;

            const indiaGDP = this.indiaGDP;
            const targetGDP = targetCountryData.gdp;
            const targetGrowthRate = targetCountryData.growthRate / 100;

            // Calculate future target GDP
            const futureTargetGDP = targetGDP * Math.pow(1 + targetGrowthRate, this.yearsToSurpass);

            // Calculate required growth rate
            // Formula: requiredRate = ((futureTarget / indiaCurrent)^(1/years) - 1) * 100
            this.requiredGrowthRate = (Math.pow(futureTargetGDP / indiaGDP, 1 / this.yearsToSurpass) - 1) * 100;
        },

        generateProjectionData(indiaGDP, targetGDP, indiaGrowthRate, targetGrowthRate, years) {
            const data = {
                labels: [],
                india: [],
                target: []
            };

            for (let i = 0; i <= years; i++) {
                data.labels.push(this.currentYear + i);
                data.india.push(indiaGDP * Math.pow(1 + indiaGrowthRate, i));
                data.target.push(targetGDP * Math.pow(1 + targetGrowthRate, i));
            }

            return data;
        },

        findYearsToSurpass(indiaGDP, targetGDP, indiaGrowthRate, targetGrowthRate) {
            // If India is already larger than target country
            if (indiaGDP >= targetGDP) {
                return 0;
            }

            // If India's growth rate is less than or equal to target country's,
            // it will never surpass in a pure mathematical model
            if (indiaGrowthRate <= targetGrowthRate) {
                return Infinity;
            }

            // Calculate exact year using logarithmic formula
            // Formula: t = ln(targetGDP/indiaGDP) / ln((1+indiaGrowthRate)/(1+targetGrowthRate))
            const numerator = Math.log(targetGDP / indiaGDP);
            const denominator = Math.log((1 + indiaGrowthRate) / (1 + targetGrowthRate));

            // Ensure we never return a negative value
            return Math.max(0, numerator / denominator);
        },

        renderApexChart(data) {
            try {
                // Destroy previous chart if it exists
                if (this.chart) {
                    this.chart.destroy();
                    this.chart = null;
                }

                // Determine the maximum number of years to show on the chart
                // Show either up to the year of surpassing + 10 years, or maximum 50 years
                const maxYearsToShow = this.yearToSurpass === Infinity ? 50 : Math.min(this.yearToSurpass + 10, 50);

                // Prepare chart data with limited years for better visualization
                const chartData = {
                    labels: data.labels.slice(0, maxYearsToShow + 1),
                    india: data.india.slice(0, maxYearsToShow + 1),
                    target: data.target.slice(0, maxYearsToShow + 1)
                };

                // Create ApexCharts options
                const options = {
                    series: [
                        {
                            name: 'India',
                            data: chartData.india
                        },
                        {
                            name: this.selectedCountryName,
                            data: chartData.target
                        }
                    ],
                    chart: {
                        type: 'line',
                        height: 340,
                        zoom: {
                            enabled: true
                        },
                        toolbar: {
                            show: false
                        },
                        fontFamily: 'inherit',
                        animations: {
                            enabled: true,
                            easing: 'easeinout',
                            speed: 800
                        }
                    },
                    dataLabels: {
                        enabled: false
                    },
                    stroke: {
                        width: [4, 4],
                        curve: 'smooth',
                        colors: ['#FF9933', '#3B82F6'] // India orange, blue
                    },
                    title: {
                        text: 'GDP Projection (Trillion USD)',
                        align: 'left',
                        style: {
                            fontSize: '14px',
                            fontWeight: 'bold',
                            color: '#263238'
                        }
                    },
                    grid: {
                        row: {
                            colors: ['#f3f3f3', 'transparent'],
                            opacity: 0.5
                        }
                    },
                    xaxis: {
                        categories: chartData.labels,
                        title: {
                            text: 'Year'
                        },
                        labels: {
                            formatter: function(val) {
                                return val;
                            }
                        }
                    },
                    yaxis: {
                        title: {
                            text: 'GDP (Trillion USD)'
                        },
                        labels: {
                            formatter: function(val) {
                                return '$' + val.toFixed(1) + 'T';
                            }
                        }
                    },
                    tooltip: {
                        y: {
                            formatter: function(val) {
                                return '$' + val.toFixed(2) + ' Trillion';
                            }
                        }
                    },
                    legend: {
                        position: 'top',
                        horizontalAlign: 'right'
                    },
                    markers: {
                        size: 0,
                        hover: {
                            size: 5
                        }
                    },
                    theme: {
                        mode: 'light',
                        palette: 'palette1'
                    }
                };

                // Add intersection point if available and finite
                if (this.yearToSurpass !== null && this.yearToSurpass !== Infinity && this.yearToSurpass <= maxYearsToShow) {
                    // Get the exact intersection year text
                    const intersectionYear = Math.floor(this.yearToSurpass);
                    const intersectionValue = data.india[intersectionYear];
                    const exactYear = this.currentYear + this.yearToSurpass;
                    const exactYearText = `${Math.floor(exactYear)}Q${Math.round((exactYear - Math.floor(exactYear)) * 4)}`;

                    // Add annotation for intersection point
                    options.annotations = {
                        points: [{
                            x: this.currentYear + intersectionYear,
                            y: intersectionValue,
                            marker: {
                                size: 8,
                                fillColor: '#00E396',
                                strokeColor: '#00E396',
                                radius: 2
                            },
                            label: {
                                borderColor: '#00E396',
                                offsetY: 0,
                                style: {
                                    color: '#fff',
                                    background: '#00E396',
                                },
                                text: `Crossover: ${exactYearText}`
                            }
                        }]
                    };
                }

                // Create the chart
                this.chart = new ApexCharts(document.getElementById('gdpProjectionChart'), options);
                this.chart.render();
            } catch (error) {
                console.error('Error rendering chart:', error);
            }
        },

// Format helpers
        formatCurrency(value) {
            return value.toFixed(2);
        },

        formatNumber(value) {
            return value >= 1000000
                ? (value / 1000000).toFixed(2) + 'M'
                : value >= 1000
                    ? (value / 1000).toFixed(2) + 'K'
                    : value.toFixed(2);
        },

        formatPopulation(value) {
            if (value >= 1000) {
                return (value / 1000).toFixed(2) + ' Billion';
            }
            return value.toFixed(2) + ' Million';
        }
    },

    watch: {
        selectedCountry() {
            this.updateSelectedCountryData();
            this.updateProjections();
        }
    },

    mounted() {
        // Set current date/time and user
        this.currentDateTime = "2025-03-09 18:27:01"; // As provided
        this.currentUser = "SKSsearchtap"; // As provided

        // Wait for DOM to be fully loaded before initializing
        setTimeout(() => {
            this.fetchRealWorldBankData();
        }, 200);
    }
}).mount('#app');