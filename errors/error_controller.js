

module.exports = (error, request, responce, next) => {
    error.status = error.status || 'error';

    if (process.env.Node_env === 'development') {

        responce.status(error.status_code || 500).json({//500 = internal server error
            status: error.status,
            message: error.message,
            stack_trace: error.stack,
            error: error,
            code: error.code
        })
    } else if (process.env.Node_env === 'production') {

        if (error.isOperational) {
            responce.status(error.status_code || 500).json({//500 = internal server error
                status: error.status,
                message: error.message,
            })
        } else {
            responce.status(500).json({//500 = internal server error
                status: "error",
                message: "something went wrong, please try again later",
            })
        }
    }

}