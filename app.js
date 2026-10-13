//express file

const express = require('express'); // express document https://expressjs.com/en/4x/api/
const morgan = require('morgan')
const custom_error = require('./errors/custom_errors')
const global_error = require('./errors/error_controller')
const helmet = require('helmet')
const hpp = require('hpp')
const expressMongoSanitize = require('@exortek/express-mongo-sanitize');
const { xss } = require('express-xss-sanitizer');
const cookieParser = require('cookie-parser');
const userControllerMethods = require('./controller/controllerMethods/userControllerMethods')
const session = require('express-session');
const passport = require('passport');
const { combinedRateLimiter } = require('./config/rateLimiter')

const prismaUserRoutes = require('./routes/prismaUserRoutes');
const prismaAdminRoutes = require('./routes/prismaAdminRoutes');
const prismaOwnerRoutes = require('./routes/prismaOwnerRoutes');
const prismaModeratorRoutes = require('./routes/prismaModeratorRoutes');


let app = express();

//add security headers
app.use(helmet())

//rate limiting
app.use('/api', combinedRateLimiter);
// let limiter = rate_limit({ //when reseting the code it will reset the rate limit
//     max: 1000,
//     windowMs: 60 * 60 * 1000, //within 1 hour the user can make 1000 thousand requests
//     message: 'Too many requests from this IP, please try again in an hour'
// })
// app.use('/api', limiter)
// test the application https://chat.deepseek.com/share/b4w0odj07lbz9eva3s


//installed middlewares
app.use(express.json({ //set limit for content in request body 
    limit: '10kb'
}));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));



//sanitize query and body
// express-mongo-sanitize: $ and .

app.use(expressMongoSanitize({ 
    replaceWith: '',           // Replace matched chars with this string
    removeMatches: false,      // Remove entire key-value pair if pattern matches
    sanitizeObjects: ['body', 'query'],  // Request fields to sanitize
    maxDepth: null,            // Max recursion depth (null = unlimited)
    onSanitize: ({ key, originalValue, sanitizedValue }) => {
        console.log(`before sanitizing: ${{ originalValue }}`)
        console.log(`after sanitizing: ${{ sanitizedValue }}`)
        console.log(`Sanitized ${key}`)
    }
}));
// This sanitizes req.body, req.query, and req.headers
// xss-sanitizer: <, >, ", ', &, /, =, (, ), ;
app.use(xss());

//to get jwt from cookies
app.use(cookieParser());



app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: userControllerMethods.parseExpirationToMs(process.env.login_expires)
    }
}));

app.use(passport.initialize());
app.use(passport.session());
require('./services/prismaPassport');



app.use(hpp()) //to prevent parameter pollution

if (process.env.NODE_ENV === 'development') { app.use(morgan('dev')) } //it will show the API methode & URL & status & time in ms & no of bits used
app.use(express.static('./public')) //it will show the static files in the public folder // as routes but for static files



//custom middlewares
app.use((request , responce , next) => {
    request.requestedAT = new Date().toLocaleTimeString();
    next();
})


// app.use('/api/v1/prisma/movies', movieRoutesPrisma) 

app.use('/v1/student', prismaUserRoutes)
app.use('/v1/admin', prismaAdminRoutes)
app.use('/v1/owner', prismaOwnerRoutes)
app.use('/v1/moderator', prismaModeratorRoutes)


const path = require('path');

// serve the built frontend, AFTER the API routes
const frontendPath = path.join(__dirname, 'package');
app.use(express.static(frontendPath));
app.get(/.*/, (request, response) => {
    response.sendFile(path.join(frontendPath, 'index.html'));
});

//for unknown routes in /api/v1/movies only
//only for get app.get()
//app.all() for any kind of request
app.all(/.*/, (request, responce, next) => {
    const error = new custom_error(`Cant find ${request.originalUrl} on the server`, 404)
    next(error)

})




//global error handling middleware
app.use(global_error)




module.exports = app;


