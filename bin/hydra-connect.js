#!/usr/bin/env node

var fs = require('fs');
var path = require('path');
var optparse = require('optparse');
var operations = require('./operations.js');

/* Displays the help text */

function displayHelp(executable) {
    function displayTab(len, maxlen) {
        for(var i = 0; i < maxlen - len; i++) {
            process.stdout.write(" ");
        }
    }

    process.stdout.write("Usage: " + executable + " --url URL [OPTION]\n\n");

    process.stdout.write("Remotely controls a Hydra continuous integration service instance through the\n");
    process.stdout.write("command-line and Hydra's REST API.\n\n");

    process.stdout.write("If you don't know what option to pick, start with --projects to query a project\n");
    process.stdout.write("overview. The tool will provide suggestions for successive operations that\n");
    process.stdout.write("you can execute.\n\n");

    process.stdout.write("Options:\n");

    var maxlen = 30;

    for(var i = 0; i < switches.length; i++) {

        var currentSwitch = switches[i];

        process.stdout.write("  ");

        if(currentSwitch.length == 3) {
            process.stdout.write(currentSwitch[0] + ", "+currentSwitch[1]);
            displayTab(currentSwitch[0].length + 2 + currentSwitch[1].length, maxlen);
            process.stdout.write(currentSwitch[2]);
        } else {
            process.stdout.write(currentSwitch[0]);
            displayTab(currentSwitch[0].length, maxlen);
            process.stdout.write(currentSwitch[1]);
        }

        process.stdout.write("\n");
    }

    process.stdout.write("\nEnvironment:\n");
    process.stdout.write("  HYDRA_SESSION              Memorizes an authenticated Hydra session id\n");
    process.stdout.write("  HYDRA_HTTP_BASIC_USERNAME  Memorizes a HTTP basic username\n");
    process.stdout.write("  HYDRA_HTTP_BASIC_PASSWORD  Memorizes a HTTP basic password\n");
    process.exit(0);
}

/* Display the version, if it has been requested */

function displayVersion() {
    var version = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "package.json"))).version;

    process.stdout.write("hydra-connect " + version + "\n");
    process.exit(0);
}

/* Define command-line options */

var switches = [
    ['-h', '--help', 'Shows help sections'],
    ['-v', '--version', 'Shows the version'],
    ['-u', '--url URL', 'The Hydra URL'],
    ['--login', 'Authenticate to Hydra with a username and password'],
    ['--logout', 'Terminates an authenticated Hydra session'],
    ['--projects', 'Shows an overview of the projects'],
    ['--project ID', 'Shows the properties of a project'],
    ['--jobset ID', 'Shows the properties of a jobset that belongs to a project'],
    ['--evals', 'Shows the evaluations of a jobset'],
    ['--eval ID', 'Shows the properties of an evaluation'],
    ['--build ID', 'Shows the properties of a build'],
    ['--build-product ID', 'Fetches a build product'],
    ['--reproduce', 'Fetches a reproduce script of a build'],
    ['--restart', 'Restarts a failed build'],
    ['--cancel', 'Cancels a scheduled build'],
    ['--bump', 'Bump build priority'],
    ['--keep', 'Keep build product'],
    ['--raw-log', 'Fetches the raw log of a build'],
    ['--queue', 'Fetches an overview of all builds in the queue'],
    ['--status', 'Fetches an overview of all running builds in the queue'],
    ['--num-of-builds', 'Shows the amount of builds in the queue'],
    ['--clear-vcs-cache', 'Clears the VCS cache'],
    ['--clear-failed-cache', 'Clears the failed builds cache'],
    ['--clear-non-current', 'Clears all non current builds from the queue'],
    ['--json', 'Display the output in JSON format'],
    ['--display-invisible', 'Display invisible entries'],
    ['--modify', 'Creates or updates a record'],
    ['--delete', 'Deletes a record']
];

var parser = new optparse.OptionParser(switches);

/* Set some variables and their default values */

var operation = null;
var projectId = null;
var jobsetId = null;
var evalId = null;
var buildId = null;
var buildProductId = null;

var hydraSettings = {
    url: null,
    showJSON: false,
    displayInvisible: false,
    executable: ""
};

hydraSettings.hydraSession = process.env["HYDRA_SESSION"];
hydraSettings.httpBasicUsername = process.env["HYDRA_HTTP_BASIC_USERNAME"];
hydraSettings.httpBasicPassword = process.env["HYDRA_HTTP_BASIC_PASSWORD"];

/* Define process rules for option parameters */

parser.on('help', function(arg, value) {
    operation = "help";
});

parser.on('version', function(arg, value) {
    operation = "version";
});

parser.on('login', function(arg, value) {
    operation = "login";
});

parser.on('logout', function(arg, value) {
    operation = "logout";
});

parser.on('url', function(arg, value) {
    hydraSettings.url = value;
});

parser.on('json', function(arg, value) {
    hydraSettings.showJSON = true;
});

parser.on('display-invisible', function(arg, value) {
    hydraSettings.displayInvisible = true;
});

parser.on('projects', function(arg, value) {
    operation = "projects";
});

parser.on('project', function(arg, value) {
    operation = "project";
    projectId = value;
});

parser.on('jobset', function(arg, value) {
    operation = "jobset";
    jobsetId = value;
});

parser.on('evals', function(arg, value) {
    operation = "evals";
});

parser.on('eval', function(arg, value) {
    operation = "eval";
    evalId = value;
});

parser.on('build', function(arg, value) {
    operation = "build";
    buildId = value;
});

parser.on('build-product', function(arg, value) {
    operation = "build-product";
    buildProductId = value;
});

parser.on('reproduce', function(arg, value) {
    operation = "reproduce";
});

parser.on('restart', function(arg, value) {
    operation = "restart-build";
});

parser.on('cancel', function(arg, value) {
    operation = "cancel-build";
});

parser.on('bump', function(arg, value) {
    operation = "bump-build";
});

parser.on('keep', function(arg, value) {
    operation = "keep-build-product";
});

parser.on('raw-log', function(arg, value) {
    operation = "raw-log";
});

parser.on('queue', function(arg, value) {
    operation = "queue";
});

parser.on('status', function(arg, value) {
    operation = "status";
});

parser.on('num-of-builds', function(arg, value) {
    operation = "num-of-builds";
});

parser.on('clear-vcs-cache', function(arg, value) {
    operation = "clear-vcs-cache";
});

parser.on('clear-failed-cache', function(arg, value) {
    operation = "clear-failed-cache";
});

parser.on('clear-non-current', function(arg, value) {
    operation = "clear-non-current";
});

parser.on('modify', function(arg, value) {
    switch(operation) {
        case "project":
            operation = "modify-project";
            break;
        case "jobset":
            operation = "modify-jobset";
            break;
        default:
            throw "I don't know what kind of record to modify!";
    }
});

parser.on('delete', function(arg, value) {
    switch(operation) {
        case "project":
            operation = "delete-project";
            break;
        case "jobset":
            operation = "delete-jobset";
            break;
        default:
            throw "I don't know what kind of record to delete!";
    }
});

/* Define process rules for non-option parameters */

parser.on(1, function(opt) {
    hydraSettings.executable = path.basename(opt);
});

/* Do the actual command-line parsing */

parser.parse(process.argv);

/* Check for the help or version parameters */

switch(operation) {
    case "help":
        displayHelp(hydraSettings.executable);
        break;
    case "version":
        displayVersion();
        break;
}

/* Verify the input parameters */

if(hydraSettings.url === null) {
    process.stderr.write("No Hydra URL has been specified!\n");
    process.exit(1);
}

if(operation === null) {
    process.stderr.write("No operation has been specified!\n");
    process.exit(1);
}

/* Perform the desired operation */

function exitCallback(err) {
    if(err) {
        process.stderr.write(err + "\n");
        process.exit(1);
    } else {
        process.exit(0);
    }
}

switch(operation) {
    case "login":
        operations.login(hydraSettings, exitCallback);
        break;
    case "logout":
        operations.logout(hydraSettings, exitCallback);
        break;
    case "projects":
        operations.queryProjects(hydraSettings, exitCallback);
        break;
    case "project":
        operations.queryProject(hydraSettings, projectId, exitCallback);
        break;
    case "modify-project":
        operations.modifyProject(hydraSettings, projectId, exitCallback);
        break;
    case "delete-project":
        operations.deleteProject(hydraSettings, projectId, exitCallback);
        break;
    case "jobset":
        operations.queryJobset(hydraSettings, projectId, jobsetId, exitCallback);
        break;
    case "modify-jobset":
        operations.modifyJobset(hydraSettings, projectId, jobsetId, exitCallback);
        break;
    case "delete-jobset":
        operations.deleteJobset(hydraSettings, projectId, jobsetId, exitCallback);
        break;
    case "evals":
        operations.queryEvaluations(hydraSettings, projectId, jobsetId, exitCallback);
        break;
    case "eval":
        operations.queryEvaluation(hydraSettings, evalId, exitCallback);
        break;
    case "build":
        operations.queryBuild(hydraSettings, buildId, exitCallback);
        break;
    case "build-product":
        operations.downloadBuildProduct(hydraSettings, buildId, buildProductId, exitCallback);
        break;
    case "keep-build-product":
        operations.keepBuildProduct(hydraSettings, buildId, buildProductId, exitCallback);
        break;
    case "raw-log":
        operations.downloadRawBuildLog(hydraSettings, buildId, exitCallback);
        break;
    case "reproduce":
        operations.downloadBuildReproduceScript(hydraSettings, buildId, exitCallback);
        break;
    case "restart-build":
        operations.restartBuild(hydraSettings, buildId, exitCallback);
        break;
    case "cancel-build":
        operations.cancelBuild(hydraSettings, buildId, exitCallback);
        break;
    case "bump-build":
        operations.bumpBuildPriority(hydraSettings, buildId, exitCallback);
        break;
    case "queue":
        operations.showQueue(hydraSettings, exitCallback);
        break;
    case "status":
        operations.showStatus(hydraSettings, exitCallback);
        break;
    case "num-of-builds":
        operations.showNumOfBuildsInQueue(hydraSettings, exitCallback);
        break;
    case "clear-vcs-cache":
        operations.clearVCSCaches(hydraSettings, exitCallback);
        break;
    case "clear-failed-cache":
        operations.clearFailedBuildsCache(hydraSettings, exitCallback);
        break;
    case "clear-non-current":
        operations.clearNonCurrentBuildsFromQueue(hydraSettings, exitCallback);
        break;
    default:
        process.stderr.write("Unknown operation: "+operation);
        process.exit(1);
}
