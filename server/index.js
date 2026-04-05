const express = require('express');
const schedule = require('node-schedule');

const app = express();
const PORT = process.env.PORT || 3000;

// Express server setup
app.get('/', (req, res) => {
    res.send('Flight Price Tracker Server is Running!');
});

// Scheduled job for daily price checks at 3:00 AM and 3:00 PM
const job = schedule.scheduleJob('0 3,15 * * *', function(){
    console.log('Checking prices...');
    // Add your price check logic here
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
