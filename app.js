// Initialize the map
const map = L.map('map').setView([51.505, -0.09], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Variables to store routes and markers
let routeLayers = [];
let markers = [];
let currentLanguage = 'ro';
let routeCount = 1;

// Function to update text content based on language
function updateLanguage(lang) {
    currentLanguage = lang;
    document.documentElement.lang = lang;
    
    // Update all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (translations[lang][key]) {
            element.textContent = translations[lang][key];
        }
    });
    
    // Update all elements with data-i18n-placeholder attribute
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const key = element.getAttribute('data-i18n-placeholder');
        if (translations[lang][key]) {
            element.placeholder = translations[lang][key];
        }
    });
    
    // Update language buttons
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(`lang-${lang}`).classList.add('active');
}

// Function to add a new route section
function addRoute() {
    routeCount++;
    const routeSection = document.createElement('div');
    routeSection.className = 'route-section';
    routeSection.id = `route-${routeCount}`;
    
    routeSection.innerHTML = `
        <div class="route-header">
            <h3 data-i18n="routeTitle">Ruta ${routeCount}</h3>
            <button class="remove-route-btn" onclick="removeRoute(${routeCount})">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="input-section">
            <div class="input-group">
                <label for="start-${routeCount}" data-i18n="startLabel">Punct de plecare:</label>
                <div class="input-with-icon">
                    <i class="fas fa-map-marker-alt"></i>
                    <input type="text" id="start-${routeCount}" data-i18n-placeholder="startPlaceholder" placeholder="Introduceți locația de plecare">
                </div>
            </div>
            <div class="input-group">
                <label for="end-${routeCount}" data-i18n="endLabel">Destinație:</label>
                <div class="input-with-icon">
                    <i class="fas fa-flag"></i>
                    <input type="text" id="end-${routeCount}" data-i18n-placeholder="endPlaceholder" placeholder="Introduceți destinația">
                </div>
            </div>
            <div class="input-group">
                <label for="fuel-efficiency-${routeCount}" data-i18n="efficiencyLabel">Consum de combustibil (L/100km):</label>
                <div class="input-with-icon">
                    <i class="fas fa-gas-pump"></i>
                    <input type="number" id="fuel-efficiency-${routeCount}" value="8" min="1" max="30" step="0.1">
                </div>
            </div>
            <button class="calculate-route-btn primary-btn" data-route="${routeCount}" data-i18n="calculateButton">Calculează Ruta</button>
        </div>
        <div class="route-results hidden" id="results-${routeCount}">
            <div class="results-grid">
                <div class="result-item">
                    <i class="fas fa-route"></i>
                    <span data-i18n="distanceLabel">Distanță totală:</span>
                    <span class="distance">0</span>
                    <span data-i18n="km">km</span>
                </div>
                <div class="result-item">
                    <i class="fas fa-gas-pump"></i>
                    <span data-i18n="fuelLabel">Consum total de combustibil:</span>
                    <span class="fuel">0</span>
                    <span data-i18n="liters">litri</span>
                </div>
            </div>
        </div>
    `;
    
    document.querySelector('.routes-container').appendChild(routeSection);
    updateLanguage(currentLanguage);
}

// Function to remove a route section
function removeRoute(routeId) {
    if (routeCount > 1) {
        const routeSection = document.getElementById(`route-${routeId}`);
        if (routeSection) {
            routeSection.remove();
            
            // Update route numbers
            const routes = document.querySelectorAll('.route-section');
            routes.forEach((route, index) => {
                const routeNumber = index + 1;
                route.id = `route-${routeNumber}`;
                route.querySelector('h3').textContent = currentLanguage === 'ro' ? `Ruta ${routeNumber}` : `Route ${routeNumber}`;
                route.querySelector('.calculate-route-btn').dataset.route = routeNumber;
                route.querySelector('.remove-route-btn').onclick = () => removeRoute(routeNumber);
                
                // Update input IDs
                const inputs = route.querySelectorAll('input');
                inputs[0].id = `start-${routeNumber}`;
                inputs[1].id = `end-${routeNumber}`;
                inputs[2].id = `fuel-efficiency-${routeNumber}`;
            });
            
            routeCount--;
            checkGenerateReportButton();
        }
    }
}

// Function to check if generate report button should be enabled
function checkGenerateReportButton() {
    const calculateButtons = document.querySelectorAll('.calculate-route-btn');
    const generateReportButton = document.getElementById('generate-report');
    let hasCalculatedRoutes = false;
    
    calculateButtons.forEach(button => {
        const routeId = button.dataset.route;
        const results = document.getElementById(`results-${routeId}`);
        if (results && !results.classList.contains('hidden')) {
            hasCalculatedRoutes = true;
        }
    });
    
    if (generateReportButton) {
        generateReportButton.disabled = !hasCalculatedRoutes;
    }
}

// Function to geocode address using Nominatim
async function geocodeAddress(address) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        if (data && data.length > 0) {
            return {
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon)
            };
        }
        throw new Error('Location not found');
    } catch (error) {
        console.error('Geocoding error:', error);
        throw error;
    }
}

// Function to calculate route using OpenRouteService
async function calculateRoute(start, end) {
    try {
        const response = await fetch(`https://api.openrouteservice.org/v2/directions/driving-car?api_key=YOUR_API_KEY&start=${start.lng},${start.lat}&end=${end.lng},${end.lat}`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        
        // Extract route information
        const route = data.features[0];
        const distance = route.properties.segments[0].distance / 1000; // Convert to km
        const duration = route.properties.segments[0].duration / 60; // Convert to minutes
        
        return {
            coordinates: route.geometry.coordinates,
            distance: distance,
            duration: duration
        };
    } catch (error) {
        console.error('Routing error:', error);
        throw error;
    }
}

// Function to update the map with all routes
function updateMap() {
    // Clear previous routes and markers
    routeLayers.forEach(layer => map.removeLayer(layer));
    markers.forEach(marker => map.removeLayer(marker));
    routeLayers = [];
    markers = [];
    
    // Get all calculated routes
    const routes = document.querySelectorAll('.route-results:not(.hidden)');
    if (routes.length === 0) return;
    
    // Add all routes to map
    routes.forEach(route => {
        const routeId = route.id.split('-')[1];
        const coordinates = JSON.parse(route.dataset.coordinates).map(coord => [coord[1], coord[0]]);
        
        // Add route line
        const routeLayer = L.polyline(coordinates, { color: getRandomColor() }).addTo(map);
        routeLayers.push(routeLayer);
        
        // Add markers
        const startMarker = L.marker(coordinates[0]).addTo(map);
        const endMarker = L.marker(coordinates[coordinates.length - 1]).addTo(map);
        markers.push(startMarker, endMarker);
    });
    
    // Fit map to show all routes
    const bounds = L.latLngBounds(routeLayers.flatMap(layer => layer.getLatLngs()));
    map.fitBounds(bounds, { padding: [50, 50] });
}

// Function to get a random color for routes
function getRandomColor() {
    const colors = ['#3498db', '#e74c3c', '#2ecc71', '#f1c40f', '#9b59b6', '#1abc9c'];
    return colors[Math.floor(Math.random() * colors.length)];
}

// Function to calculate fuel consumption (L/100km)
function calculateFuelConsumption(distance, consumptionPer100km) {
    return ((distance * consumptionPer100km) / 100).toFixed(2);
}

// Function to generate PDF report
async function generatePDFReport() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.text(translations[currentLanguage].reportTitle, 20, 20);
    
    let yPosition = 40;
    const routes = document.querySelectorAll('.route-results:not(.hidden)');
    
    // Add each route to the report
    routes.forEach((route, index) => {
        const routeId = route.id.split('-')[1];
        const start = document.getElementById(`start-${routeId}`).value;
        const end = document.getElementById(`end-${routeId}`).value;
        const efficiency = document.getElementById(`fuel-efficiency-${routeId}`).value;
        const distance = route.querySelector('.distance').textContent;
        const duration = route.querySelector('.duration').textContent;
        const fuel = route.querySelector('.fuel').textContent;
        
        // Add route number
        doc.setFontSize(14);
        doc.text(`${translations[currentLanguage].routeTitle} ${index + 1}`, 20, yPosition);
        yPosition += 10;
        
        // Add route details
        doc.setFontSize(12);
        doc.text(`${translations[currentLanguage].startLabel} ${start}`, 20, yPosition);
        yPosition += 10;
        doc.text(`${translations[currentLanguage].endLabel} ${end}`, 20, yPosition);
        yPosition += 10;
        doc.text(`${translations[currentLanguage].distanceLabel} ${distance} ${translations[currentLanguage].km}`, 20, yPosition);
        yPosition += 10;
        doc.text(`${translations[currentLanguage].durationLabel} ${duration} ${translations[currentLanguage].minutes}`, 20, yPosition);
        yPosition += 10;
        doc.text(`${translations[currentLanguage].efficiencyLabel} ${efficiency}`, 20, yPosition);
        yPosition += 10;
        doc.text(`${translations[currentLanguage].fuelLabel} ${fuel} ${translations[currentLanguage].liters}`, 20, yPosition);
        yPosition += 20;
        
        // Add page break if needed
        if (yPosition > 250) {
            doc.addPage();
            yPosition = 20;
        }
    });
    
    // Add total consumption
    const totalDistance = Array.from(routes).reduce((sum, route) => 
        sum + parseFloat(route.querySelector('.distance').textContent), 0);
    const totalDuration = Array.from(routes).reduce((sum, route) => 
        sum + parseFloat(route.querySelector('.duration').textContent), 0);
    const totalFuel = Array.from(routes).reduce((sum, route) => 
        sum + parseFloat(route.querySelector('.fuel').textContent), 0);
    
    doc.setFontSize(14);
    doc.text(translations[currentLanguage].totalTitle || 'Total', 20, yPosition);
    yPosition += 10;
    doc.setFontSize(12);
    doc.text(`${translations[currentLanguage].distanceLabel} ${totalDistance.toFixed(2)} ${translations[currentLanguage].km}`, 20, yPosition);
    yPosition += 10;
    doc.text(`${translations[currentLanguage].durationLabel} ${Math.round(totalDuration)} ${translations[currentLanguage].minutes}`, 20, yPosition);
    yPosition += 10;
    doc.text(`${translations[currentLanguage].fuelLabel} ${totalFuel.toFixed(2)} ${translations[currentLanguage].liters}`, 20, yPosition);
    
    // Add timestamp
    const now = new Date();
    doc.setFontSize(10);
    doc.text(`${translations[currentLanguage].reportGenerated} ${now.toLocaleString()}`, 20, 280);
    
    // Save the PDF
    doc.save(`fuel-consumption-report-${currentLanguage}.pdf`);
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('add-route').addEventListener('click', addRoute);
    document.getElementById('generate-report').addEventListener('click', generatePDFReport);
    document.getElementById('lang-ro').addEventListener('click', () => updateLanguage('ro'));
    document.getElementById('lang-en').addEventListener('click', () => updateLanguage('en'));

    // Event delegation for calculate buttons
    document.querySelector('.routes-container').addEventListener('click', async (e) => {
        if (e.target.classList.contains('calculate-route-btn')) {
            const routeId = e.target.dataset.route;
            const startAddress = document.getElementById(`start-${routeId}`).value;
            const endAddress = document.getElementById(`end-${routeId}`).value;
            const consumptionPer100km = parseFloat(document.getElementById(`fuel-efficiency-${routeId}`).value);

            if (!startAddress || !endAddress) {
                alert(currentLanguage === 'ro' ? 'Vă rugăm să introduceți atât punctul de plecare cât și destinația' : 'Please enter both starting point and destination');
                return;
            }

            try {
                // Show loading state
                e.target.disabled = true;
                e.target.textContent = currentLanguage === 'ro' ? 'Se calculează...' : 'Calculating...';

                // Geocode addresses
                const start = await geocodeAddress(startAddress);
                const end = await geocodeAddress(endAddress);

                // Calculate route
                const route = await calculateRoute(start, end);
                const distance = route.distance;
                const duration = route.duration;

                // Calculate fuel consumption
                const fuelConsumption = calculateFuelConsumption(distance, consumptionPer100km);

                // Update results
                const results = document.getElementById(`results-${routeId}`);
                results.innerHTML = `
                    <div class="results-grid">
                        <div class="result-item">
                            <i class="fas fa-route"></i>
                            <span data-i18n="distanceLabel">Distanță totală:</span>
                            <span class="distance">${distance.toFixed(2)}</span>
                            <span data-i18n="km">km</span>
                        </div>
                        <div class="result-item">
                            <i class="fas fa-clock"></i>
                            <span data-i18n="durationLabel">Durată estimată:</span>
                            <span class="duration">${Math.round(duration)}</span>
                            <span data-i18n="minutes">minute</span>
                        </div>
                        <div class="result-item">
                            <i class="fas fa-gas-pump"></i>
                            <span data-i18n="fuelLabel">Consum total de combustibil:</span>
                            <span class="fuel">${fuelConsumption}</span>
                            <span data-i18n="liters">litri</span>
                        </div>
                    </div>
                `;
                results.classList.remove('hidden');
                
                // Store coordinates for map
                results.dataset.coordinates = JSON.stringify(route.coordinates);

                // Update map
                updateMap();

                // Enable generate report button if needed
                checkGenerateReportButton();

            } catch (error) {
                alert(currentLanguage === 'ro' 
                    ? 'Eroare la calcularea rutei: ' + error.message 
                    : 'Error calculating route: ' + error.message);
            } finally {
                // Reset button state
                e.target.disabled = false;
                e.target.textContent = translations[currentLanguage].calculateButton;
            }
        }
    });
});

// Initialize with Romanian language
updateLanguage('ro'); 