const winston = require('winston');
const { combine, timestamp, json } = winston.format;
const {createLogger, format, transports} = require("winston");
 
/*const logger = createLogger({
  level: "info",  
  format: combine(timestamp(), json()), 
 transports: [
    new winston.transports.File({
        filename: `log/sync-${formattedDate}-${mergeTime}.log` 
    }),
  ],
});*/

 async function StartLogger(filename){
    const logger = createLogger({
        level: "info",  
        /*format: combine(timestamp(), json()), */
        format: combine(timestamp({format: 'DD-MM-YYYY HH:mm:ss'}), json()),
        transports: [
            new winston.transports.File({
                  filename: `log/${filename}`
            }),
        ],
    });
    return logger;
}
module.exports = {
        StartLogger: StartLogger
};
