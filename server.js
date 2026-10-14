const env = require('dotenv').config({ path: './config.env' })
const app = require('./app')

//create a server
const port = 3000;

app.listen(port, '0.0.0.0', () => {
	console.log(`Server is running on port ${port}`);
})

