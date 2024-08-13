const axios = require('axios');
let tokenCache = null;
let tokenIndex = null;

async function fetchTokenData() {
    if (!tokenCache) {
        try {
            const response = await axios.get('https://token.jup.ag/all');
            tokenCache = response.data;

            tokenIndex = new Map();
            tokenCache.forEach(token => {
                tokenIndex.set(token.symbol.toUpperCase(), token);
                tokenIndex.set(token.address.toUpperCase(), token);
            });
        } catch (error) {
            console.error('Error fetching token data:', error);
        }
    }
}

async function getTokenData(token) {
    try {
        if (!tokenCache) {
            await fetchTokenData();
        }

        const capitalizedToken = token.toUpperCase();
        const tokenData = tokenIndex.get(capitalizedToken);
        return tokenData || null;
    } catch (error) {
        console.error('Error retrieving token data:', error);
        return null;
    }
}


// getTokenData('4V2Yvav9XF5gP4HmZBWwFDS6RFXeHydzMdr8DuqMKWLg').then(data => console.log(data));
