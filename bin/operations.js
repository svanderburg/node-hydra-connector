var slasp = require('slasp');
var prompt = require('prompt');
var Table = require('cli-table');
var HydraConnector = require('../lib/HydraConnector.js').HydraConnector;

// Display utility functions

function prefixZero(value) {
    if(value < 10) {
        return "0"+value;
    } else {
        return value;
    }
}

function displayDateAndTime(timestamp) {
    var dateObj = new Date(timestamp * 1000);

    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    var year = dateObj.getFullYear();
    var month = months[dateObj.getMonth()];
    var day = dateObj.getDate();
    var hour = prefixZero(dateObj.getHours());
    var min = prefixZero(dateObj.getMinutes());
    var sec = prefixZero(dateObj.getSeconds());

    return day + ' ' + month + ' ' + year + ' ' + hour + ':' + min + ':' + sec;
}

/* Constructs a hydra connector from the general hydra settings */
function constructHydraConnector(hydraSettings) {
    var hydraConnector = new HydraConnector(hydraSettings.url);
    hydraConnector.hydraSession = hydraSettings.hydraSession;
    return hydraConnector;
}

/*
 * Generic function that queries data, displays the data (as JSON or a custom
 * representation) and displays a number of command-line instruction suggestions
 */
function queryAndDisplayData(hydraSettings, queryData, displayData, suggestions, callback) {
    var hydraConnector = constructHydraConnector(hydraSettings);

    slasp.sequence([
        function(callback) {
            queryData(hydraConnector, callback);
        },

        function(callback, data) {
            if(hydraSettings.showJSON) {
                console.log(JSON.stringify(data, null, 2));
            } else {
                displayData(data);

                if(Array.isArray(suggestions) && suggestions.length > 0) {
                    console.log("\nSome suggestions:");
                    console.log("=================");

                    for(var i = 0; i < suggestions.length; i++) {
                        var suggestion = suggestions[i];
                        console.log(hydraSettings.executable + " " + suggestion);
                    }
                }

                callback();
            }
        }
    ], callback);
}

// CLI operations

function login(hydraSettings, callback) {
    var hydraConnector = constructHydraConnector(hydraSettings);
    var username;
    var password;

    prompt.start();

    slasp.sequence([
        function(callback) {
            prompt.get([
                {
                    name: 'username',
                    required: true
                }, {
                    name: 'password',
                    hidden: true
                }
            ], callback);
        },

        function(callback, results) {
            hydraConnector.login(results.username, results.password, callback);
        },

        function(callback) {
            console.log("Your Hydra session id is: "+hydraConnector.hydraSession);
            console.log("You can memorize it by setting the following environment variable:\n");
            console.log("export HYDRA_SESSION=" + hydraConnector.hydraSession);
            callback();
        }
    ], callback);
}

exports.login = login;

function logout(hydraSettings, callback) {
    var hydraConnector = constructHydraConnector(hydraSettings);

    slasp.sequence([
        function(callback) {
            hydraConnector.logout(callback);
        },

        function(callback) {
            console.log("You are now logged out.");
            console.log("You may probably also want to unset the following environment variable:\n");
            console.log("unset HYDRA_SESSION");
            callback();
        }
    ], callback);
}

exports.logout = logout;


function queryProjects(hydraSettings, callback) {
    queryAndDisplayData(hydraSettings, function(hydraConnector, callback) {
        hydraConnector.queryProjects(callback);
    }, function(projects) {
        var table = new Table({
            head: ['Name', 'Display name', 'Description']
        });

        for(var i = 0; i < projects.length; i++) {
            var project = projects[i];

            if(project.hidden !== 1 || hydraSettings.displayInvisible) {
                table.push([project.name, project.displayname, project.description]);
            }
        }

        console.log(table.toString());
    }, [
        "--project ID [OPTION]         Query project properties",
        "--queue [OPTION]              Show queue contents",
        "--status [OPTION]             Show running jobs in queue",
        "--num-of-builds [OPTION]      Show number of builds in queue",
        "--clear-vcs-cache [OPTION]    Clears the VCS caches",
        "--clear-failed-cache [OPTION] Clears the failed build cache",
        "--clear-non-current [OPTION]  Clears all non current builds from the queue"
    ], callback);
}

exports.queryProjects = queryProjects;

function queryProject(hydraSettings, projectId, callback) {
    queryAndDisplayData(hydraSettings, function(hydraConnector, callback) {
        hydraConnector.queryProject(projectId, callback);
    }, function(project) {
        console.log("Configuration");
        console.log("=============");

        var table = new Table();
        table.push({ "Project ID": projectId });
        table.push({ "Display name": project.displayname });
        table.push({ "Description": project.description });
        table.push({ "Owner": project.owner });
        table.push({ "Enabled": project.enabled });
        console.log(table.toString());

        if(Array.isArray(project.jobsets) && project.jobsets.length > 0) {
            console.log("\nJobsets");
            console.log("=======");

            var table = new Table({
                head: [ "Jobsets" ]
            });

            for(var i = 0; i < project.jobsets.length; i++) {
                table.push([ project.jobsets[i] ]);
            }

            console.log(table.toString());
        }

        if(Array.isArray(project.releases) && project.releases.length > 0) {
            console.log("\nReleases");
            console.log("========");

            var table = new Table({
                head: [ "Releases" ]
            });

            for(var i = 0; i < project.releases.length; i++) {
                table.push([ project.releases[i] ]);
            }

            console.log(table.toString());
        }
    }, [
        "--project ID --modify [OPTION]       Create or modify a project",
        "--project ID --delete [OPTION]       Delete a project",
        "--project ID --jobset ID [OPTION]    Query jobset properties"
    ], callback);
}

exports.queryProject = queryProject;

function modifyProject(hydraSettings, projectId, callback) {
    var hydraConnector = constructHydraConnector(hydraSettings);

    prompt.start();

    slasp.sequence([
        function(callback) {
            var schema = {
                type: "object",
                properties: {
                    name: {
                        description: "Project ID",
                        type: "string",
                        default: projectId
                    },
                    displayname: {
                        description: "Display name",
                        type: "string"
                    },
                    description: {
                        description: "Description",
                        type: "string"
                    },
                    homepage: {
                        description: "Homepage",
                        type: "string"
                    },
                    visible: {
                        description: "Visible",
                        type: "integer",
                        message: "Visible must be 0 or 1",
                        minimum: 0,
                        maximum: 1
                    },
                    enabled: {
                        description: "Enabled",
                        type: "integer",
                        message: "Enabled must be 0 or 1",
                        minimum: 0,
                        maximum: 1
                    }
                }
            };
            prompt.get(schema, callback);
        },

        function(callback, properties) {
            // Delete boolean values that are not true
            if(properties.visible !== 1) {
                delete properties.visible;
            }

            if(properties.enabled !== 1) {
                delete properties.enabled;
            }

            // Create or update the project
            hydraConnector.createOrUpdateProject(projectId, properties, callback);
        }
    ], callback);
}

exports.modifyProject = modifyProject;

function deleteProject(hydraSettings, projectId, callback) {
    var hydraConnector = constructHydraConnector(hydraSettings);
    hydraConnector.deleteProject(projectId, callback);
}

exports.deleteProject = deleteProject;

function queryJobset(hydraSettings, projectId, jobsetId, callback) {
    queryAndDisplayData(hydraSettings, function(hydraConnector, callback) {
        hydraConnector.queryJobset(projectId, jobsetId, callback);
    }, function(jobset) {
        var table = new Table();
        table.push({ "Project ID": projectId });
        table.push({ "Jobset ID": jobsetId });
        table.push({ "Enabled": jobset.enabled });
        table.push({ "Nix expression": jobset.nixexprpath+" in input: "+jobset.nixexprinput });
        table.push({ "Email override": jobset.emailoverride });

        console.log(table.toString());

        if(Object.keys(jobset.jobsetinputs).length > 0) {
            console.log("\nInputs");
            console.log("======");

            var table = new Table({
                head: [ "Input name", "Input value" ]
            });

            for(var inputName in jobset.jobsetinputs) {
                var input = jobset.jobsetinputs[inputName];
                table.push([ inputName, input.jobsetinputalts[0] ]);
            }

            console.log(table.toString());
        }

        console.log("\nEvaluation errors");
        console.log("=================");
        console.log(jobset.errormsg);
    }, [
        "--project ID --jobset ID --modify [OPTION]   Create or update jobset",
        "--project ID --jobset ID --delete [OPTION]   Delete a jobset",
        "--project ID --jobset ID --evals [OPTION]    Query evaluations"
    ], callback);
}

exports.queryJobset = queryJobset;

function modifyJobset(hydraSettings, projectId, jobsetId, callback) {
    var hydraConnector = constructHydraConnector(hydraSettings);
    var jobsetProperties;
    var inputs = {};

    prompt.start();

    slasp.sequence([
        function(callback) {
            var schema = {
                type: "object",
                properties: {
                    name: {
                        description: "Name",
                        type: "string",
                        default: jobsetId
                    },
                    description: {
                        description: "Description",
                        type: "string"
                    },
                    nixexprinput: {
                        description: "Nix expression input name",
                        type: "string"
                    },
                    nixexprpath: {
                        description: "Path to Nix expression",
                        type: "string"
                    },
                    emailoverride: {
                        description: "Email override",
                        type: "string"
                    },
                    visible: {
                        description: "Visible",
                        type: "integer",
                        message: "Visible must be 0 or 1",
                        minimum: 0,
                        maximum: 1
                    },
                    enabled: {
                        description: "Enabled",
                        type: "integer",
                        message: "Enabled must be 0 or 1",
                        minimum: 0,
                        maximum: 1
                    },
                    keepnr: {
                        description: "Number of builds to keep",
                        type: "integer",
                        minimum: 0
                    },
                    checkinterval: {
                        description: "Check interval",
                        type: "integer",
                        minimum: 0
                    },
                    schedulingshares: {
                        description: "Scheduling shares",
                        type: "integer",
                        minimum: 0
                    }
                }
            };

            prompt.get(schema, callback);
        },

        function(callback, properties) {
            // Delete boolean values that are not true

            if(properties.visible !== 1) {
                delete properties.visible;
            }

            if(properties.enabled !== 1) {
                delete properties.enabled;
            }

            // Configure inputs

            jobsetProperties = properties;

            console.log("\nConfiguring inputs. Specify an empty name to stop\n");

            var input;

            slasp.doWhilst(function(callback) {
                var schema = {
                    type: "object",
                    properties: {
                        name: {
                            description: "Input name"
                        },
                        type: {
                            description: "Input type",
                            pattern: "^(boolean|build|bzr|darcs|eval|git|githubpulls|hg|nix|path|string|svn|sysbuild)$"
                        },
                        value: {
                            description: "Input value"
                        }
                    }
                };

                prompt.get(schema, function(err, results) {
                    console.log();

                    if(err) {
                        callback(err);
                    } else {
                        input = results;
                        callback();
                    }
                });
            }, function(callback) {
                if(input.name) {
                    inputs[input.name] = {
                        type: input.type,
                        value: input.value
                    };
                    callback(null, true);
                } else {
                    callback(null, false);
                }
            }, callback);
        },

        function(callback) {
            jobsetProperties.inputs = inputs;
            hydraConnector.createOrUpdateJobset(projectId, jobsetId, jobsetProperties, callback);
        }
    ], callback);
}

exports.modifyJobset = modifyJobset;

function deleteJobset(hydraSettings, projectId, jobsetId, callback) {
    var hydraConnector = constructHydraConnector(hydraSettings);
    hydraConnector.deleteJobset(projectId, jobsetId, callback);
}

exports.deleteJobset = deleteJobset;

function queryEvaluations(hydraSettings, projectId, jobsetId, callback) {
    queryAndDisplayData(hydraSettings, function(hydraConnector, callback) {
        hydraConnector.queryEvaluations(projectId, jobsetId, callback);
    }, function(evaluationView) {
        var evaluations = evaluationView.evals;

        var table = new Table({
            head: [ "ID", "Changes" ]
        });

        for(var i = 0; i < evaluations.length; i++) {
            var evaluation = evaluations[i];

            var line = "";
            var first = true;

            for(var inputName in evaluation.jobsetevalinputs) {
                var input = evaluation.jobsetevalinputs[inputName];

                if(input.revision) {
                    if(first) {
                        first = false;
                    } else {
                        line += ", ";
                    }

                    line += inputName + " -> " + input.revision;
                }
            }

            table.push([ evaluation.id, line ]);
        }

        console.log(table.toString());
    }, [
        "--eval ID [OPTION]    Query evaluation properties"
    ], callback);
}

exports.queryEvaluations = queryEvaluations;

function queryEvaluation(hydraSettings, evalId, callback) {
    queryAndDisplayData(hydraSettings, function(hydraConnector, callback) {
        hydraConnector.queryEvaluation(evalId, callback);
    }, function(evaluation) {
        console.log("Evaluation: "+evaluation.id+"\n");

        if(evaluation.hasnewbuilds === 1) {
            console.log("This evaluation has new builds\n");
        }

        if(Array.isArray(evaluation.builds) && evaluation.builds.length > 0) {
            console.log("\nBuilds");
            console.log("======");

            var table = new Table({
                head: [ "Builds" ]
            });

            for(var i = 0; i < evaluation.builds.length; i++) {
                table.push([ evaluation.builds[i] ]);
            }

            console.log(table.toString());
        }

        if(Object.keys(evaluation.jobsetevalinputs).length > 0) {
            console.log("\nInputs");
            console.log("======");

            var table = new Table({
                head: [ "Name", "Type", "Value", "Revision" ]
            });

            for(var inputName in evaluation.jobsetevalinputs) {
                var input = evaluation.jobsetevalinputs[inputName];
                var value;

                if(input.value) {
                    value = input.value;
                } else if(input.uri) {
                    value = input.uri;
                } else {
                    value = "";
                }

                var revision = input.revision ? input.revision : "";

                table.push([ inputName, input.type, value, revision ]);
            }

            console.log(table.toString());
        }
    }, [
        "--build ID [OPTION]    Query build properties"
    ], callback);
}

exports.queryEvaluation = queryEvaluation;

function queryBuild(hydraSettings, buildId, callback) {
    queryAndDisplayData(hydraSettings, function(hydraConnector, callback) {
        hydraConnector.queryBuild(buildId, callback);
    }, function(build) {
        console.log("Build ID: "+build.id+"\n");

        var table = new Table();
        table.push({ "Finished": build.finished });
        table.push({ "Status": HydraConnector.determineBuildStatus(build.buildstatus) });
        table.push({ "System": build.system });
        table.push({ "Nix name": build.nixname });
        table.push({ "Part of evaluations": JSON.stringify(build.jobsetevals, null, 2) });

        if(build.stoptime && build.timestamp) {
            table.push({ "Duration": (build.stoptime - build.timestamp) + " seconds" });
            table.push({ "Finished at": displayDateAndTime(build.stoptime) });
        }
        console.log(table.toString());

        if(Object.keys(build.buildproducts).length > 0) {
            console.log("\nBuild products");
            console.log("==============");

            var table = new Table({
                head: [ "ID", "Type", "Name" ]
            });

            for(var buildProductId in build.buildproducts) {
                var buildproduct = build.buildproducts[buildProductId];
                table.push([ buildProductId, buildproduct.type, buildproduct.name ]);
            }

            console.log(table.toString());
        }

        console.log("\nDetails");
        console.log("=======");
        console.log("Derivation store path: "+build.drvpath);
        console.log("Output store paths:");

        var table = new Table({
            head: [ "Name", "Path" ]
        });

        for(var outputName in build.buildoutputs) {
            var buildoutput = build.buildoutputs[outputName];
            table.push([ outputName, buildoutput.path ]);
        }

        console.log(table.toString());
    }, [
        "--eval ID [OPTION]                             Query evaluation properties",
        "--build ID --raw-log [OPTION]                  Download raw build log",
        "--build ID --restart [OPTION]                  Restart failed build",
        "--build ID --cancel [OPTION]                   Cancel scheduled build",
        "--build ID --bump [OPTION]                     Bump build priority",
        "--build ID --build-product ID [OPTION]         Download build product",
        "--build ID --build-product ID --keep [OPTION]  Keep build product"
    ], callback);
}

exports.queryBuild = queryBuild;

function downloadBuildProduct(hydraSettings, buildId, buildProductId, callback) {
    var hydraConnector = constructHydraConnector(hydraSettings);
    hydraConnector.downloadBuildProduct(buildId, buildProductId, process.stdout, callback);
}

exports.downloadBuildProduct = downloadBuildProduct;

function keepBuildProduct(hydraSettings, buildId, buildProductId, callback) {
    var hydraConnector = constructHydraConnector(hydraSettings);
    hydraConnector.keepBuildProduct(buildId, buildProductId, callback);
}

exports.keepBuildProduct = keepBuildProduct;

function downloadRawBuildLog(hydraSettings, buildId, callback) {
    var hydraConnector = constructHydraConnector(hydraSettings);
    hydraConnector.downloadRawBuildLog(buildId, process.stdout, callback);
}

exports.downloadRawBuildLog = downloadRawBuildLog;

function downloadBuildReproduceScript(hydraSettings, buildId, callback) {
    var hydraConnector = constructHydraConnector(hydraSettings);
    hydraConnector.downloadBuildReproduceScript(buildId, process.stdout, callback);
}

exports.downloadBuildReproduceScript = downloadBuildReproduceScript;

function restartBuild(hydraSettings, buildId, callback) {
    var hydraConnector = constructHydraConnector(hydraSettings);
    hydraConnector.restartBuild(buildId, callback);
}

exports.restartBuild = restartBuild;

function cancelBuild(hydraSettings, buildId, callback) {
    var hydraConnector = constructHydraConnector(hydraSettings);
    hydraConnector.cancelBuild(buildId, callback);
}

exports.cancelBuild = cancelBuild;

function bumpBuildPriority(hydraSettings, buildId, callback) {
    var hydraConnector = constructHydraConnector(hydraSettings);
    hydraConnector.bumpBuildPriority(buildId, callback);
}

exports.bumpBuildPriority = bumpBuildPriority;

function displayQueue(hydraSettings, queryQueue, callback) {
    queryAndDisplayData(hydraSettings, function(hydraConnector, callback) {
        queryQueue(hydraConnector, callback);
    }, function(queue) {
        var table = new Table({
            head: [ "ID", "Project", "Jobset", "Job", "Queued at", "Nix name", "System" ]
        });

        for(var i = 0; i < queue.length; i++) {
            var job = queue[i];
            table.push([ job.id, job.project, job.jobset, job.job, displayDateAndTime(job.timestamp), job.nixname, job.system ]);
        }

        console.log(table.toString());
    }, [
        "--build ID [OPTION]    Query build properties"
    ], callback);
}

function showQueue(hydraSettings, callback) {
    displayQueue(hydraSettings, function(hydraConnector, callback) {
        hydraConnector.showQueue(callback);
    }, callback);
}

exports.showQueue = showQueue;

function showStatus(hydraSettings, callback) {
    displayQueue(hydraSettings, function(hydraConnector, callback) {
        hydraConnector.showStatus(callback);
    }, callback);
}

exports.showStatus = showStatus;

function showNumOfBuildsInQueue(hydraSettings, callback) {
    queryAndDisplayData(hydraSettings, function(hydraConnector, callback) {
        hydraConnector.showNumOfBuildsInQueue(callback);
    }, function(result) {
        console.log(result);
    }, [], callback);
}

exports.showNumOfBuildsInQueue = showNumOfBuildsInQueue;

function clearVCSCaches(hydraSettings, callback) {
    var hydraConnector = constructHydraConnector(hydraSettings);
    hydraConnector.clearVCSCaches(callback);
}

exports.clearVCSCaches = clearVCSCaches;

function clearFailedBuildsCache(hydraSettings, callback) {
    var hydraConnector = constructHydraConnector(hydraSettings);
    hydraConnector.clearFailedBuildsCache(callback);
}

exports.clearFailedBuildsCache = clearFailedBuildsCache;

function clearNonCurrentBuildsFromQueue(hydraSettings, callback) {
    var hydraConnector = constructHydraConnector(hydraSettings);
    hydraConnector.clearNonCurrentBuildsFromQueue(callback);
}

exports.clearNonCurrentBuildsFromQueue = clearNonCurrentBuildsFromQueue;
