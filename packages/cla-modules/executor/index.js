module.exports = (process.env.EXEC === 'ssh')? require('./ssh') : require('./exec');
