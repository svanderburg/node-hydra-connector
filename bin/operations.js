var slasp = require('slasp');
var prompt = require('prompt');
var HydraConnector = require('../lib/HydraConnector.js').HydraConnector;

function constructHydraConnector(hydraSettings) {
    var hydraConnector = new HydraConnector(hydraSettings.url);
    hydraConnector.hydraSession = hydraSettings.hydraSession;
    return hydraConnector;
}

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
    var hydraConnector = constructHydraConnector(hydraSettings);

    slasp.sequence([
        function(callback) {
            hydraConnector.queryProjects(callback);
        },

        function(callback, projects) {
            if(hydraSettings.showJSON) {
                console.log(JSON.stringify(projects, null, 2));
            } else {
                for(var i = 0; i < projects.length; i++) {
                    var project = projects[i];
                    console.log(project.name + " | " + project.displayname + " | " + project.description);
                }

                console.log("\nSome suggestions:");
                console.log("=================");
                console.log(hydraSettings.executable + " --project ID [OPTION]    Query project properties");
                console.log(hydraSettings.executable + " --queue [OPTION]         Show queue contents");
                console.log(hydraSettings.executable + " --status [OPTION]        Show running jobs in queue");
                console.log(hydraSettings.executable + " --num-of-builds [OPTION] Show number of builds in queue");
            }

            callback();
        }
    ], callback);
}

exports.queryProjects = queryProjects;

function queryProject(hydraSettings, projectId, callback) {
    var hydraConnector = constructHydraConnector(hydraSettings);

    slasp.sequence([
        function(callback) {
            hydraConnector.queryProject(projectId, callback);
        },

        function(callback, project) {
            if(hydraSettings.showJSON) {
                console.log(JSON.stringify(project, null, 2));
            } else {
                console.log("Configuration");
                console.log("=============");
                console.log("Project ID: "+projectId);
                console.log("Display name: "+project.displayname);
                console.log("Description: "+project.description);
                console.log("Owner: "+project.owner);
                console.log("Enabled: "+project.enabled);

                if(Array.isArray(project.jobsets) && project.jobsets.length > 0) {
                    console.log("\nJobsets");
                    console.log("=======");

                    for(var i = 0; i < project.jobsets.length; i++) {
                        var jobsetId = project.jobsets[i];
                        console.log(jobsetId);
                    }
                }

                if(Array.isArray(project.releases) && project.releases.length > 0) {
                    console.log("\nReleases");
                    console.log("========");

                    for(var i = 0; i < project.releases.length; i++) {
                        var releaseId = project.releases[i];
                        console.log(releaseId);
                    }
                }

                console.log("\nSome suggestions:");
                console.log("=================");
                console.log(hydraSettings.executable + " --project ID --modify                Create or modify a project");
                console.log(hydraSettings.executable + " --project ID --delete                Delete a project");
                console.log(hydraSettings.executable + " --project ID --jobset ID [OPTION]    Query jobset properties");
            }

            callback();
        }
    ], callback);
}

exports.queryProject = queryProject;

function modifyProject(hydraSettings, projectId, callback) {
    var hydraConnector = constructHydraConnector(hydraSettings);

    prompt.start();

    slasp.sequence([
        function(callback) {
            prompt.get([
                {
                    name: 'displayname'
                }, {
                    name: 'description'
                }, {
                    name: 'homepage'
                }, {
                    name: 'visible',
                    message: 'visible should be 0 or 1',
                    required: true
                }, {
                    name: 'enabled',
                    message: 'enabled should be 0 or 1',
                    required: true
                }
            ], callback);
        },

        function(callback, properties) {
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
    var hydraConnector = constructHydraConnector(hydraSettings);

    slasp.sequence([
        function(callback) {
            hydraConnector.queryJobset(projectId, jobsetId, callback);
        },

        function(callback, jobset) {
            if(hydraSettings.showJSON) {
                console.log(JSON.stringify(jobset, null, 2));
            } else {
                console.log("Configuration");
                console.log("=============");
                console.log("Project ID: "+projectId);
                console.log("Jobset ID: "+jobsetId);
                console.log("Enabled: "+jobset.enabled);
                console.log("Nix expression: "+jobset.nixexprpath+" in input: "+jobset.nixexprinput);
                console.log("Email override: "+jobset.emailoverride);

                if(Object.keys(jobset.jobsetinputs) > 0) {
                    console.log("\nInputs:");
                    console.log("=======");

                    for(var inputName in jobset.jobsetinputs) {
                        var input = jobset.jobsetinputs[i];
                        console.log(inputName + ": " + input.jobsetinputalts[0]);
                    }
                }

                console.log("\nEvaluation errors");
                console.log("=================");
                console.log(jobset.errormsg);

                console.log("\nSome suggestions:");
                console.log("=================");
                console.log(hydraSettings.executable + " --project ID --jobset ID --modify            Create or update jobset");
                console.log(hydraSettings.executable + " --project ID --jobset ID --delete            Delete a jobset");
                console.log(hydraSettings.executable + " --project ID --jobset ID --evals [OPTION]    Query evaluations");
            }

            callback();
        }
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
            prompt.get([
                {
                    name: 'name'
                }, {
                    name: 'description'
                }, {
                    name: 'nixexprinput'
                }, {
                    name: 'nixexprpath'
                }, {
                    name: 'emailoverride'
                }, {
                    name: 'visible',
                    message: 'visible should be 0 or 1',
                    required: true
                }, {
                    name: 'enabled',
                    message: 'enabled should be 0 or 1',
                    required: true
                }, {
                    name: 'keepnr'
                }, {
                    name: 'checkinterval'
                }, {
                    name: 'schedulingshares'
                }
            ], callback);
        },

        function(callback, properties) {
            jobsetProperties = properties;

            console.log("\nConfiguring inputs. Specify an empty name to stop\n");

            var input;

            slasp.doWhilst(function(callback) {
                prompt.get([
                    {
                        name: 'name'
                    },
                    {
                        name: 'type'
                    },
                    {
                        name: 'value'
                    }
                ], function(err, results) {
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
    var hydraConnector = constructHydraConnector(hydraSettings);

    slasp.sequence([
        function(callback) {
            hydraConnector.queryEvaluations(projectId, jobsetId, callback);
        },

        function(callback, evaluationView) {
            if(hydraSettings.showJSON) {
                console.log(JSON.stringify(evaluationView, null, 2));
            } else {
                var evaluations = evaluationView.evals;

                for(var i = 0; i < evaluations.length; i++) {
                    var evaluation = evaluations[i];

                    var line = evaluation.id + ": ";
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

                    console.log(line);
                }
            }

            console.log("\nSome suggestions:");
            console.log("=================");
            console.log(hydraSettings.executable + " --eval ID [OPTION]    Query evaluation properties");

            callback();
        }
    ], callback);
}

exports.queryEvaluations = queryEvaluations;

function queryEvaluation(hydraSettings, evalId, callback) {
    var hydraConnector = constructHydraConnector(hydraSettings);

    slasp.sequence([
        function(callback) {
            hydraConnector.queryEvaluation(evalId, callback);
        },

        function(callback, evaluation) {
            if(hydraSettings.showJSON) {
                console.log(JSON.stringify(evaluation, null, 2));
            } else {
                console.log("Evaluation: "+evaluation.id+"\n");

                if(evaluation.hasnewbuilds === 1) {
                    console.log("This evaluation has new builds\n");
                }

                if(Array.isArray(evaluation.builds) && evaluation.builds.length > 0) {
                    console.log("Builds");
                    console.log("======");

                    for(var i = 0; i < evaluation.builds.length; i++) {
                        var build = evaluation.builds[i];
                        console.log(build);
                    }
                }

                if(Object.keys(evaluation.jobsetevalinputs).length > 0) {
                    console.log("\nInputs");
                    console.log("======");

                    for(var inputName in evaluation.jobsetevalinputs) {
                        var input = evaluation.jobsetevalinputs[inputName];

                        console.log("name: "+inputName);
                        console.log("type: "+input.type);
                        console.log("value: "+(input.value ? input.value : input.uri));
                        console.log("revision: "+input.revision + "\n");
                    }
                }

                console.log("Some suggestions:");
                console.log("=================");
                console.log(hydraSettings.executable + " --build ID [OPTION]    Query build properties");

                callback();
            }
        }
    ], callback);
};

exports.queryEvaluation = queryEvaluation;

function queryBuild(hydraSettings, buildId, callback) {
    var hydraConnector = constructHydraConnector(hydraSettings);

    slasp.sequence([
        function(callback) {
            hydraConnector.queryBuild(buildId, callback);
        },

        function(callback, build) {
            if(hydraSettings.showJSON) {
                console.log(JSON.stringify(build, null, 2));
            } else {
                console.log("Build ID: "+build.id+"\n");

                console.log("Finished: "+build.finished);
                console.log("Status: "+build.buildstatus); // 0: success, 1: failed, 2: dependency failed
                console.log("System: "+build.system);
                console.log("Nix name: "+build.nixname);
                console.log("Part of evaluations: "+JSON.stringify(build.jobsetevals));
                console.log("Duration: "+(build.stoptime - build.timestamp));
                console.log("Finished at: "+build.stoptime);

                if(Object.keys(build.buildproducts).length > 0) {
                    console.log("\nBuild products");
                    console.log("==============");

                    for(var buildProductId in build.buildproducts) {
                        var buildproduct = build.buildproducts[buildProductId];

                        console.log(buildProductId+": (" + buildproduct.type + ") "+buildproduct.name);
                    }
                }

                console.log("\nDetails");
                console.log("=======");
                console.log("Derivation store path: "+build.drvpath);
                console.log("Output store paths:");

                for(var outputName in build.buildoutputs) {
                    var buildoutput = build.buildoutputs[outputName];
                    console.log(outputName + " = " + buildoutput.path);
                }

                console.log("\nSome suggestions:");
                console.log("=================");
                console.log(hydraSettings.executable + " --eval ID [OPTION]                             Query evaluation properties");
                console.log(hydraSettings.executable + " --build ID --raw-log [OPTION]                  Download raw build log");
                console.log(hydraSettings.executable + " --build ID --restart [OPTION]                  Restart failed build");
                console.log(hydraSettings.executable + " --build ID --cancel [OPTION]                   Cancel scheduled build");
                console.log(hydraSettings.executable + " --build ID --bump [OPTION]                     Bump build priority");
                console.log(hydraSettings.executable + " --build ID --build-product ID [OPTION]         Download build product");
                console.log(hydraSettings.executable + " --build ID --build-product ID --keep [OPTION]  Keep build product");

                callback();
            }
        }
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

function displayQueue(hydraSettings, queue) {
    for(var i = 0; i < queue.length; i++) {
        var job = queue[i];
        console.log(job.id + " | " + job.project + ":" + job.jobset + ":" + job.job + " | " + job.timestamp  + " | " + job.nixname + " | " + job.system);
    }

    console.log("\nSome suggestions:");
    console.log("=================");
    console.log(hydraSettings.executable + " --build ID [OPTION]    Query build properties");
}

function showQueue(hydraSettings, callback) {
    var hydraConnector = constructHydraConnector(hydraSettings);

    slasp.sequence([
        function(callback) {
            hydraConnector.showQueue(callback);
        },

        function(callback, queue) {
            if(hydraSettings.showJSON) {
                console.log(JSON.stringify(queue, null, 2));
            } else {
                displayQueue(hydraSettings, queue);
            }

            callback();
        }
    ], callback);
}

exports.showQueue = showQueue;

function showStatus(hydraSettings, callback) {
    var hydraConnector = constructHydraConnector(hydraSettings);

    slasp.sequence([
        function(callback) {
            hydraConnector.showStatus(callback);
        },

        function(callback, queue) {
            if(hydraSettings.showJSON) {
                console.log(JSON.stringify(queue, null, 2));
            } else {
                displayQueue(hydraSettings, queue);
            }

            callback();
        }
    ], callback);
}

exports.showStatus = showStatus;

function showNumOfBuildsInQueue(hydraSettings, callback) {
    var hydraConnector = constructHydraConnector(hydraSettings);

    slasp.sequence([
        function(callback) {
            hydraConnector.showNumOfBuildsInQueue(callback);
        },

        function(callback, result) {
            console.log(result);
            callback();
        }
    ], callback);
}

exports.showNumOfBuildsInQueue = showNumOfBuildsInQueue;
