var http = require('http');
var https = require('https');
var url = require('url');
var Client = require('node-rest-client').Client;

/**
 * Constructs a new Hydra connector instance.
 *
 * @class HydraConnector
 * @classdesc An API that can be used to invoke any REST operation that Hydra provides.
 *
 * @constructor
 * @param {String} url Base URL of the Hydra instance
 * @param {String} httpBasicUsername HTTP basic authentication username (optional)
 * @param {String} httpBasicPassword HTTP basic authentication password (optional)
 * @param {Object} options Option settings passed to node-rest-client (optional)
 */
function HydraConnector(url, httpBasicUsername, httpBasicPassword, options) {
    this.url = url;
    this.httpBasicUsername = httpBasicUsername;
    this.httpBasicPassword = httpBasicPassword;

    if(httpBasicUsername) {
        // When HTTP basic credentials have been provided, configure the REST client to use them
        if(options === undefined) {
            options = {};
        }
        options["user"] = httpBasicUsername;
        options["password"] = httpBasicPassword;
    }

    this.client = new Client(options);
}

/**
 * Constructs an HTTP header with common properties that should be bundled with
 * any REST API call.
 *
 * @method
 * @return {Object} An object representing the HTTP header fields to bundle
 */
HydraConnector.prototype.constructHeaders = function() {
    var headers = {
        Accept: "application/json",
        "Content-Type": "application/json",
    };

    if(this.hydraSession) {
        headers["cookie"] = 'hydra_session=' + this.hydraSession
    }

    return headers;
};

function composeOperationCallback(operation, callback) {
    return function(data, response) {
        if(response.statusCode >= 200 && response.statusCode < 300) {
            callback(null, data);
        } else {
            callback(operation + " operation returned status: " + response.statusCode);
        }
    }
}

/**
 * A generic GET operation wrapper that encapsulates most Hydra settings.
 *
 * @method
 * @param {String} path Path to the operation URL
 * @param {function(Object, Object)} callback Callback that gets invoked when the operation finishes. On error, it sets the first parameter to an error message. On success, it propagates the data it gets.
 */
HydraConnector.prototype.executeGetOperation = function(path, callback) {
    var self = this;

    self.client.get(self.url + "/" + path, {
        headers: self.constructHeaders()
    }, composeOperationCallback("GET", callback));
};

/**
 * A generic PUT operation wrapper that encapsulates most Hydra settings.
 *
 * @method
 * @param {String} path Path to the operation URL
 * @param {Object} data Data to propagate as part of the body
 * @param {function(Object, Object)} callback Callback that gets invoked when the operation finishes. On error, it sets the first parameter to an error message. On success, it propagates the data it gets.
 */
HydraConnector.prototype.executePutOperation = function(path, data, callback) {
    var self = this;

    self.client.put(self.url + "/" + path, {
        headers: self.constructHeaders(),
        data: data
    }, composeOperationCallback("PUT", callback));
};

/**
 * A generic DELETE operation wrapper that encapsulates most Hydra settings.
 *
 * @method
 * @param {String} path Path to the operation URL
 * @param {function(Object, Object)} callback Callback that gets invoked when the operation finishes. On error, it sets the first parameter to an error message. On success, it propagates the data it gets.
 */
HydraConnector.prototype.executeDeleteOperation = function(path, callback) {
    var self = this;

    self.client.delete(self.url + "/" + path, {
        headers: self.constructHeaders()
    }, composeOperationCallback("DELETE", callback));
};

/**
 * Authenticates with the given credentials so that data, such as projects and
 * jobsets, can be modified.
 *
 * @method
 * @param {String} username Username of the user to authenticate
 * @param {String} password Password of the user to authenticate
 * @param {function(Object, Object)} callback Callback that gets invoked when the operation finishes. On error, it sets the first parameter to an error message. On success, it propagates the login message.
 */
HydraConnector.prototype.login = function(username, password, callback) {
    var self = this;

    var headers = self.constructHeaders();
    headers["Referer"] = self.url + "/";

    self.client.post(self.url + "/login", {
        headers: headers,
        data: {
            username: username,
            password: password
        }
    }, function(data, response) {
        if(response.statusCode == 200) {
            // Parse the resulting cookie and fetch the hydra_session from it
            var cookies = response.headers['set-cookie'];

            for(var i = 0; i < cookies.length; i++) {
                var cookie = cookies[i];

                if(cookie.startsWith("hydra_session=")) {
                    self.hydraSession = cookie.substr("hydra_session=".length, 40);
                }
            }

            if(self.hydraSession) {
                callback(null, data);
            } else {
                callback("Cannot find hydra_session cookie");
            }
        } else {
            callback(data.error);
        }
    });
};

/**
 * Logs the authenticated user out.
 *
 * @method
 * @param {function(Object, Object)} callback Callback that gets invoked when the operation finishes. On error, it sets the first parameter to an error message.
 */
HydraConnector.prototype.logout = function(callback) {
    var self = this;

    var headers = self.constructHeaders();
    headers["Referer"] = self.url + "/";

    self.client.post(self.url + "/logout", {
        headers: headers
    }, function(data, response) {
        if(response.statusCode == 204) {
            self.hydraSession = "";
            callback();
        } else {
            callback("Logout returned status: "+response.statusCode);
        }
    });
};

/**
 * A generic file download function that will follow redirects if needed and
 * streams the data to a given writable stream.
 *
 * @method
 * @param {String} path Path to the operation URL
 * @param {WritableStream} ws A writable stream where the data will be piped to
 * @param {function(Object, Object)} callback Callback that gets invoked when the operation finishes. On error, it sets the first parameter to an error message.
 */
HydraConnector.prototype.downloadFile = function(path, ws, callback) {
    var self = this;

    var parsedUrl = url.parse(this.url + "/" + path);
    var httpModule;

    if(parsedUrl.protocol == "http:") {
        httpModule = http;
    } else if(parsedUrl.protocol == "https:") {
        httpModule = https;
    } else {
        return callback("Unknown protocol: "+parsedUrl.protocol);
    }

    httpModule.get({
        hostname: parsedUrl.hostname,
        path: parsedUrl.path,
        port: parsedUrl.port,
        auth: this.httpBasicUsername ? this.httpBasicUsername + ":" + this.httpBasicPassword : undefined
    }, function(response) {
        if(response.statusCode == 302) {
            var parsedUrl = url.parse(response.headers.location);
            self.downloadFile(parsedUrl.path, ws, callback); // Follow redirect
        } else if(response.statusCode >= 400 && response.statusCode < 600) {
            callback("Download file operation returned status: "+response.statusCode);
        } else {
            response.pipe(ws);
            ws.on('finish', function() {
                ws.close(callback);
            });
        }
    }).on('error', function(err) {
        callback(err);
    });
};

/**
 * Queries an overview of all jobs in the queue.
 *
 * @method
 * @param {function(Object, Object)} callback Callback that gets invoked when the operation finishes. On error, it sets the first parameter to an error message. On success, it propagates the data it gets.
 */
HydraConnector.prototype.showQueue = function(callback) {
    this.executeGetOperation("queue", callback);
};

/**
 * Queries an overview of all running jobs in the queue.
 *
 * @method
 * @param {function(Object, Object)} callback Callback that gets invoked when the operation finishes. On error, it sets the first parameter to an error message. On success, it propagates the data it gets.
 */
HydraConnector.prototype.showStatus = function(callback) {
    this.executeGetOperation("status", callback);
};

/**
 * Queries the amount of jobs in the queue.
 *
 * @method
 * @param {function(Object, Object)} callback Callback that gets invoked when the operation finishes. On error, it sets the first parameter to an error message. On success, it propagates the data it gets.
 */
HydraConnector.prototype.showNumOfBuildsInQueue = function(callback) {
    this.executeGetOperation("api/nrqueue", callback);
};

/**
 * Queries an overview of all projects.
 *
 * @method
 * @param {function(Object, Object)} callback Callback that gets invoked when the operation finishes. On error, it sets the first parameter to an error message. On success, it propagates the data it gets.
 */
HydraConnector.prototype.queryProjects = function(callback) {
    this.executeGetOperation("", callback);
};

/**
 * Queries the properties of an individual project including the releases and jobsets.
 *
 * @method
 * @param {String} projectId ID of the project
 * @param {function(Object, Object)} callback Callback that gets invoked when the operation finishes. On error, it sets the first parameter to an error message. On success, it propagates the data it gets.
 */
HydraConnector.prototype.queryProject = function(projectId, callback) {
    this.executeGetOperation("project/" + projectId, callback);
};

/**
 * Creates a new project with the given properties if it does not exists or
 * otherwise updates the existing project with the same id.
 *
 * You need sufficient user privileges to create or update a project.
 *
 * @method
 * @param {String} projectId ID of the project
 * @param {Object} properties Properties of the project to modify
 * @param {String} properties.displayname
 * @param {String} properties.description
 * @param {String} properties.homepage
 * @param {Number} properties.visible
 * @param {Number} properties.enabled
 * @param {function(Object, Object)} callback Callback that gets invoked when the operation finishes. On error, it sets the first parameter to an error message.
 */
HydraConnector.prototype.createOrUpdateProject = function(projectId, properties, callback) {
    this.executePutOperation("project/" + projectId, properties, callback);
};

/**
 * Deletes a project.
 *
 * You need sufficient user privileges to create or update a project.
 *
 * @method
 * @param {String} projectId ID of the project
 * @param {function(Object, Object)} callback Callback that gets invoked when the operation finishes. On error, it sets the first parameter to an error message.
 */
HydraConnector.prototype.deleteProject = function(projectId, callback) {
    this.executeDeleteOperation("project/" + projectId, callback);
};

/**
 * Queries the properties of an individual jobset.
 *
 * @method
 * @param {String} projectId ID of the project
 * @param {String} jobsetId ID of the jobset
 * @param {function(Object, Object)} callback Callback that gets invoked when the operation finishes. On error, it sets the first parameter to an error message. On success, it propagates the data it gets.
 */
HydraConnector.prototype.queryJobset = function(projectId, jobsetId, callback) {
    this.executeGetOperation("jobset/" + projectId + "/" + jobsetId, callback);
};

/**
 * Creates a new project with the given properties if it does not exists or
 * otherwise updates the existing project with the same id.
 *
 * You need sufficient user privileges to create or update a jobset.
 *
 * @method
 * @param {String} projectId ID of the project
 * @param {String} jobsetId ID of the jobset
 * @param {Object} properties Properties of the jobset to modify
 * @param {String} properties.name
 * @param {String} properties.description
 * @param {String} properties.nixexprinput
 * @param {String} properties.nixexprpath
 * @param {String} properties.emailoverride
 * @param {Number} properties.enabled
 * @param {Number} properties.visible
 * @param {Number} properties.keepnr
 * @param {Number} properties.checkinterval
 * @param {Number} properties.schedulingshares
 * @param {Object} properties.inputs each key inputname, each value: {type = "git", value = "https://..."}
 * @param {function(Object, Object)} callback Callback that gets invoked when the operation finishes. On error, it sets the first parameter to an error message.
 */
HydraConnector.prototype.createOrUpdateJobset = function(projectId, jobsetId, properties, callback) {
    this.executePutOperation("jobset/" + projectId + "/" + jobsetId, properties, callback);
};

/**
 * Deletes a jobset.
 * You need sufficient user privileges to create or update a jobset.
 *
 * @method
 * @param {String} projectId ID of the project
 * @param {String} jobsetId ID of the jobset
 * @param {function(Object, Object)} callback Callback that gets invoked when the operation finishes. On error, it sets the first parameter to an error message.
 */
HydraConnector.prototype.deleteJobset = function(projectId, jobsetId, callback) {
    this.executeDeleteOperation("jobset/" + projectId + "/" + jobsetId, callback);
};

/**
 * Queries the evaluations of a jobset.
 *
 * @method
 * @param {String} projectId ID of the project
 * @param {String} jobsetId ID of the jobset
 * @param {function(Object, Object)} callback Callback that gets invoked when the operation finishes. On error, it sets the first parameter to an error message. On success, it propagates the data it gets.
 */
HydraConnector.prototype.queryEvaluations = function(projectId, jobsetId, callback) {
    this.executeGetOperation("jobset/" + projectId + "/" + jobsetId + "/evals", callback);
};

/**
 * Queries the properties of an evaluation.
 *
 * @method
 * @param {String} evalId ID of the evaluation
 * @param {function(Object, Object)} callback Callback that gets invoked when the operation finishes. On error, it sets the first parameter to an error message. On success, it propagates the data it gets.
 */
HydraConnector.prototype.queryEvaluation = function(evalId, callback) {
    this.executeGetOperation("eval/" + evalId, callback);
};

/**
 * Cancels all builds part of the specified evaluation.
 *
 * @method
 * @param {String} evalId ID of the evaluation
 * @param {function(Object, Object)} callback Callback that gets invoked when the operation finishes. On error, it sets the first parameter to an error message.
 */
HydraConnector.prototype.cancelBuilds = function(evalId, callback) {
    this.executeGetOperation("eval/" + evalId + "/cancel", callback);
};

/**
 * Bumps the priority of all builds part of the specified evaluation.
 * You need administration privileges to execute this operation.
 *
 * @method
 * @param {String} evalId ID of the evaluation
 * @param {function(Object, Object)} callback Callback that gets invoked when the operation finishes. On error, it sets the first parameter to an error message.
 */
HydraConnector.prototype.bumpEvaluationPriorities = function(evalId, callback) {
    this.executeGetOperation("eval/" + evalId + "/bump", callback);
};

/**
 * Restarts all aborted builds part of the specified evaluation.
 * You need administration privileges to execute this operation.
 *
 * @method
 * @param {String} evalId ID of the evaluation
 * @param {function(Object, Object)} callback Callback that gets invoked when the operation finishes. On error, it sets the first parameter to an error message.
 */
HydraConnector.prototype.restartAbortedBuilds = function(evalId, callback) {
    this.executeGetOperation("eval/" + evalId + "/restart_aborted", callback);
};

/**
 * Restarts all failed builds part of the specified evaluation.
 * You need administration privileges to execute this operation.
 *
 * @method
 * @param {String} evalId ID of the evaluation
 * @param {function(Object, Object)} callback Callback that gets invoked when the operation finishes. On error, it sets the first parameter to an error message.
 */
HydraConnector.prototype.restartFailedBuilds = function(evalId, callback) {
    this.executeGetOperation("eval/" + evalId + "/restart_failed", callback);
};

/**
 * Queries the properties of a build.
 *
 * @method
 * @param {String} buildId ID of a build
 * @param {function(Object, Object)} callback Callback that gets invoked when the operation finishes. On error, it sets the first parameter to an error message. On success, it propagates the data it gets.
 */
HydraConnector.prototype.queryBuild = function(buildId, callback) {
    this.executeGetOperation("build/" + buildId, callback);
};

/**
 * Restarts a failed build.
 * You need administration privileges to execute this operation.
 *
 * @method
 * @param {String} buildId ID of a build
 * @param {function(Object, Object)} callback Callback that gets invoked when the operation finishes. On error, it sets the first parameter to an error message.
 */
HydraConnector.prototype.restartBuild = function(buildId, callback) {
    this.executeGetOperation("build/" + buildId + "/restart", callback);
};

/**
 * Cancels a scheduled build.
 * You need administration privileges to execute this operation.
 *
 * @method
 * @param {String} buildId ID of a build
 * @param {function(Object, Object)} callback Callback that gets invoked when the operation finishes. On error, it sets the first parameter to an error message.
 */
HydraConnector.prototype.cancelBuild = function(buildId, callback) {
    this.executeGetOperation("build/" + buildId + "/cancel", callback);
};

/**
 * Bumps the priority of a build.
 * You need administration privileges to execute this operation.
 *
 * @method
 * @param {String} buildId ID of a build
 * @param {function(Object, Object)} callback Callback that gets invoked when the operation finishes. On error, it sets the first parameter to an error message.
 */
HydraConnector.prototype.bumpBuildPriority = function(buildId, callback) {
    this.executeGetOperation("build/" + buildId + "/bump", callback);
};

/**
 * Downloads a script that can be used to reproduce a build locally.
 *
 * @method
 * @param {String} buildId ID of a build
 * @param {WritableStream} ws A writable stream where the data will be piped to
 * @param {function(Object, Object)} callback Callback that gets invoked when the operation finishes. On error, it sets the first parameter to an error message.
 */
HydraConnector.prototype.downloadBuildReproduceScript = function(buildId, ws, callback) {
    this.downloadFile("build/" + buildId + "/reproduce", ws, callback);
};

/**
 * Downloads a raw log file of a build.
 *
 * @method
 * @param {String} buildId ID of a build
 * @param {WritableStream} ws A writable stream where the data will be piped to
 * @param {function(Object, Object)} callback Callback that gets invoked when the operation finishes. On error, it sets the first parameter to an error message.
 */
HydraConnector.prototype.downloadRawBuildLog = function(buildId, ws, callback) {
    this.downloadFile("build/" + buildId + "/log/raw", ws, callback);
};

/**
 * Prevents a build product from being garbage collected.
 *
 * @method
 * @param {String} buildId ID of a build
 * @param {String} buildProductId ID of a build product
 * @param {function(Object, Object)} callback Callback that gets invoked when the operation finishes. On error, it sets the first parameter to an error message.
 */
HydraConnector.prototype.keepBuildProduct = function(buildId, buildProductId, callback) {
    this.executeGetOperation("build/" + buildId + "/keep/" + buildProductId, callback);
};

/**
 * Downloads a build product.
 *
 * @method
 * @param {String} buildId ID of a build
 * @param {String} buildProductId ID of a build product
 * @param {WritableStream} ws A writable stream where the data will be piped to
 * @param {function(Object, Object)} callback Callback that gets invoked when the operation finishes. On error, it sets the first parameter to an error message.
 */
HydraConnector.prototype.downloadBuildProduct = function(buildId, buildProductId, ws, callback) {
    this.downloadFile("build/" + buildId + "/download/" + buildProductId, ws, callback);
};

/**
 * Clears the VCS caches.
 * You need administration privileges to execute this operation.
 *
 * @method
 * @param {function(Object, Object)} callback Callback that gets invoked when the operation finishes. On error, it sets the first parameter to an error message.
 */
HydraConnector.prototype.clearVCSCaches = function(callback) {
    this.executeGetOperation("admin/clear-vcs-cache", callback);
};

/**
 * Clears the failed build cache.
 * You need administration privileges to execute this operation.
 *
 * @method
 * @param {function(Object, Object)} callback Callback that gets invoked when the operation finishes. On error, it sets the first parameter to an error message.
 */
HydraConnector.prototype.clearFailedBuildsCache = function(callback) {
    this.executeGetOperation("admin/clear-failed-cache", callback);
};

/**
 * Clears all non current builds from the queue.
 * You need administration privileges to execute this operation.
 *
 * @method
 * @param {function(Object, Object)} callback Callback that gets invoked when the operation finishes. On error, it sets the first parameter to an error message.
 */
HydraConnector.prototype.clearNonCurrentBuildsFromQueue = function(callback) {
    this.executeGetOperation("admin/clear-queue-non-current", callback);
};

exports.HydraConnector = HydraConnector;
