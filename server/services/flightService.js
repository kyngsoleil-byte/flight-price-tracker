const axios = require('axios');
const db = require('../config/firebase');
const AMADEUS_API_KEY = process.env.AMADEUS_API_KEY;
const AMADEUS_API_SECRET = process.env.AMADEUS_API_SECRET;

let amadeusToken = null;
let tokenExpiry = null;

async function getAmadeusToken() {
    if (amadeusToken && tokenExpiry && new Date() < tokenExpiry) {
        return amadeusToken;
    }

    try {
        const response = await axios.post('https://test.api.amadeus.com/v1/security/oauth2/token', `grant_type=client_credentials&client_id=${AMADEUS_API_KEY}&client_secret=${AMADEUS_API_SECRET}`, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        amadeusToken = response.data.access_token;
        tokenExpiry = new Date(Date.now() + (response.data.expires_in * 1000));
        return amadeusToken;
    } catch (error) {
        console.error('Error getting Amadeus token:', error.message);
        throw error;
    }
}

async function fetchFlightPrices() {
    try {
        const token = await getAmadeusToken();
        const params = {
            originLocationCode: 'YYZ',
            destinationLocationCode: 'KIN',
            departureDate: '2026-12-27',
            returnDate: '2027-01-10',
            adults: 2,
            children: 3,
            infants: 1,
            carrierCode: 'BW',
            nonStop: true,
            maxResults: 1
        };

        const response = await axios.get('https://test.api.amadeus.com/v2/shopping/flight-offers', {
            headers: { 'Authorization': `Bearer ${token}` },
            params: params
        });

        if (response.data.data && response.data.data.length > 0) {
            const flight = response.data.data[0];
            const price = parseFloat(flight.price.grandTotal);
            const currency = flight.price.currency;
            return {
                price: price,
                currency: currency,
                airline: flight.validatingAirlineCodes[0],
                duration: flight.itineraries[0].duration,
                direct: flight.itineraries[0].segments.length === 1,
                timestamp: new Date(),
                flightDetails: flight
            };
        } else {
            console.log('No flights found');
            return null;
        }
    } catch (error) {
        console.error('Error fetching flight prices:', error.message);
        return null;
    }
}

async function updatePriceHistory(flightData) {
    try {
        const pricesRef = db.collection('flight_prices');
        const latestSnapshot = await pricesRef.orderBy('timestamp', 'desc').limit(1).get();
        let previousPrice = null;

        if (!latestSnapshot.empty) {
            previousPrice = latestSnapshot.docs[0].data().price;
        }

        await pricesRef.add({
            price: flightData.price,
            currency: flightData.currency,
            previousPrice: previousPrice,
            airline: flightData.airline,
            duration: flightData.duration,
            direct: flightData.direct,
            timestamp: flightData.timestamp,
            priceChange: previousPrice ? flightData.price - previousPrice : 0
        });
        console.log('Price history updated');
    } catch (error) {
        console.error('Error updating price history:', error.message);
    }
}

async function checkFlightPrices() {
    try {
        const flightData = await fetchFlightPrices();
        if (flightData) {
            await updatePriceHistory(flightData);
            console.log('Flight prices checked and updated');
        }
    } catch (error) {
        console.error('Error in checkFlightPrices:', error.message);
    }
}

module.exports = { fetchFlightPrices, updatePriceHistory, checkFlightPrices };