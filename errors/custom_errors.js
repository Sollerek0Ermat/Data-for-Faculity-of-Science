// class custom_error extends Error{
//     constructor(message, status_code) {

//         super(message)
//         this.status_code = status_code
//         this.status = status_code >= 400 && status_code < 500 ? 'fail' : 'error'

//         this.isOperational = true

//         Error.captureStackTrace(this, this.constructor)

//     }
// }

// module.exports = custom_error

// //const error = new custom_error('error message' , 404)

// errors/custom_errors.js
// errors/custom_errors.js
const { Prisma } = require('@prisma/client');

class custom_error extends Error {
    constructor(errorInput, status_code) {

        let message = errorInput;
        let finalStatusCode = status_code;
        let errorCode = null;


        if (errorInput instanceof Prisma.PrismaClientKnownRequestError) {

            // newer Prisma driver-adapter versions wrap raw Postgres errors here
            const pgErrorCode = errorInput.meta?.driverAdapterError?.cause?.code
                || errorInput.meta?.driverAdapterError?.code;


            errorCode = pgErrorCode || errorInput.code;

            if (errorInput.code === 'P2003' || pgErrorCode === '23503' || pgErrorCode === '23001') {
                message = 'Cannot complete this action because other records still depend on this one. Please remove those first.';
                finalStatusCode = 400;
            }
            else if (errorInput.code === 'P2002' || pgErrorCode === 'P2002' || pgErrorCode === 'P2002') {
                message = 'A specific field must be unique on all the database check your inputs';
                finalStatusCode = 400;
            }
            else if (errorInput.code === 'P2028' || pgErrorCode === 'P2028' || pgErrorCode === 'P2028' || errorInput.code === 'P2024' || pgErrorCode === 'P2024' || pgErrorCode === 'P2024') {
                message = 'transaction timeout hit, please try again';
                finalStatusCode = 400;
            }
            else {
                message = errorInput.message;
                finalStatusCode = status_code || 400;
            }
        }

        super(message);
        this.status_code = finalStatusCode;
        this.status = finalStatusCode >= 400 && finalStatusCode < 500 ? 'fail' : 'error';
        this.isOperational = true;
        this.code = errorCode;
        
        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = custom_error;