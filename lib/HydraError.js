/**
 * Constructs a new Hydra error object.
 *
 * @class HydraError
 * @classdesc Represents a Hydra failure that includes the HTTP status code
 *
 * @constructor
 * @param {Number} statusCode The HTTP status code
 * @param {String} message Corresponding error message
 */
function HydraError(statusCode, message) {
    this.statusCode = statusCode;
    this.message = message;
}

/**
 * @see String#toString
 */
HydraError.prototype.toString = function() {
    return this.message;
};

exports.HydraError = HydraError;
