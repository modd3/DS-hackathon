require('dotenv').config();
const { app } = require('./app');
const { startIngestionConsumer } = require('./workers/ingestionConsumer');

const port = Number(process.env.PORT || 4000);

startIngestionConsumer();

app.listen(port, () => {
  console.log(`Dayliff 1000 Eyes server listening on port ${port}`);
});
