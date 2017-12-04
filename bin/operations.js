var slasp = require('slasp');
var prompt = require('prompt');
var Table = require('cli-table');
var HydraConnector = require('../lib/HydraConnector.js').HydraConnector;

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

function displayBuildStatus(buildstatus) {
    if(buildstatus === null) {
        return "";
    } else {
        switch(buildstatus) {
            case 0:
                return "Success";
            case 1:
                return "Failed";
            case 2:
                return "Dependency failed";
            default:
                return "Unknown status: "+buildstatus;
        }
    }
}

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
                var table = new Table({
                    head: ['Name', 'Display name', 'Description']
                });

                for(var i = 0; i < projects.length; i++) {
                    var project = projects[i];
                    table.push([project.name, project.displayname, project.description]);
                }

                console.log(table.toString());

                console.log("\nSome suggestions:");
                console.log("=================");
                console.log(hydraSettings.executable + " --project ID [OPTION]         Query project properties");
                console.log(hydraSettings.executable + " --queue [OPTION]              Show queue contents");
                console.log(hydraSettings.executable + " --status [OPTION]             Show running jobs in queue");
                console.log(hydraSettings.executable + " --num-of-builds [OPTION]      Show number of builds in queue");
                console.log(hydraSettings.executable + " --clear-vcs-cache [OPTION]    Clears the VCS caches");
                console.log(hydraSettings.executable + " --clear-failed-cache [OPTION] Clears the failed build cache");
                console.log(hydraSettings.executable + " --clear-non-current [OPTION]  Clears all non current builds from the queue");
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

                console.log("\nSome suggestions:");
                console.log("=================");
                console.log(hydraSettings.executable + " --project ID --modify [OPTION]       Create or modify a project");
                console.log(hydraSettings.executable + " --project ID --delete [OPTION]       Delete a project");
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

                console.log("\nSome suggestions:");
                console.log("=================");
                console.log(hydraSettings.executable + " --project ID --jobset ID --modify [OPTION]   Create or update jobset");
                console.log(hydraSettings.executable + " --project ID --jobset ID --delete [OPTION]   Delete a jobset");
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

                var table = new Table();
                table.push({ "Finished": build.finished });
                table.push({ "Status": displayBuildStatus(build.buildstatus) });
                table.push({ "System": build.system });
                table.push({ "Nix name": build.nixname });
                table.push({ "Part of evaluations": JSON.stringify(build.jobsetevals) });

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
    var table = new Table({
        head: [ "ID", "Project", "Jobset", "Job", "Queued at", "Nix name", "System" ]
    });

    for(var i = 0; i < queue.length; i++) {
        var job = queue[i];
        table.push([ job.id, job.project, job.jobset, job.job, displayDateAndTime(job.timestamp), job.nixname, job.system ]);
    }

    console.log(table.toString());

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
