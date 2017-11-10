var slasp = require('slasp');
var prom2cb = require('prom2cb');
var prompt = require('password-prompt');
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

    slasp.sequence([
        function(callback) {
            prom2cb.chainCallback(prompt('username: ', { method: "hide" }), callback);
        },

        function(callback, _username) {
            username = _username;
            prom2cb.chainCallback(prompt('password: ', { method: "hide" }), callback);
        },

        function(callback, _password) {
            password = _password;
            hydraConnector.login(username, password, callback);
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
                console.log(hydraSettings.executable + " --project ID --jobset ID [OPTION]    Query jobset properties");
            }

            callback();
        }
    ], callback);
}

exports.queryProject = queryProject;

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
                console.log(hydraSettings.executable + " --project ID --jobset ID --evals [OPTION]    Query evaluations");
            }

            callback();
        }
    ], callback);
}

exports.queryJobset = queryJobset;

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
                console.log(hydraSettings.executable + " --eval ID [OPTION]                      Query evaluation properties");
                console.log(hydraSettings.executable + " --build ID --raw-log [OPTION]           Download raw build log");
                console.log(hydraSettings.executable + " --build ID --build-product ID [OPTION]  Download build product");

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

function downloadRawBuildLog(hydraSettings, buildId, url, callback) {
    var hydraConnector = constructHydraConnector(hydraSettings);

    hydraConnector.downloadRawBuildLog(buildId, process.stdout, callback);
}

exports.downloadRawBuildLog = downloadRawBuildLog;

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
