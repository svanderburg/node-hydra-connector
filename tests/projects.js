var slasp = require('slasp');
var assert = require('assert');
var HydraConnector = require('../lib/HydraConnector.js').HydraConnector;

function assertEqualProject(actual, expected) {
    assert.equal(actual.displayname, expected.displayname);
    assert.equal(actual.description, expected.description);
    assert.equal(actual.hidden, !expected.visible);
    assert.equal(actual.enabled, expected.enabled);
}

describe('Hydra connector', function() {
    var hydraConnector = new HydraConnector("http://localhost");

    var projectSettings = {
        displayname: "Foobar",
        description: "Test project",
        visible: 1,
        enabled: 1
    };

    before(function(callback) {
        hydraConnector.login("sander", "releasethepressure", callback);
    });

    after(function(callback) {
        hydraConnector.logout(callback);
    });

    it('should create a new project with name foobar', function(callback) {
        hydraConnector.createOrUpdateProject("foobar", projectSettings, callback);
    });

    it('has the foobar project in the overview', function(callback) {
        slasp.sequence([
            function(callback) {
                hydraConnector.queryProjects(callback);
            },

            function(callback, projects) {
                for(var i = 0; i < projects.length; i++) {
                    var project = projects[i];
                    if(project.name == "foobar") {
                        return callback();
                    }
                }

                callback("Cannot find foobar project in overview");
            }
        ], callback);
    });

    it('has a project with the same properties as the project settings', function(callback) {
        slasp.sequence([
            function(callback) {
                hydraConnector.queryProject("foobar", callback);
            },

            function(callback, project) {
                assertEqualProject(project, projectSettings);
                callback();
            }
        ], callback);
    });

    var newProjectSettings = {
        displayname: "Foobaz",
        description: "Updated test project",
        visible: 1,
        enabled: 1
    };

    it('should update the foobar project settings', function(callback) {
        hydraConnector.createOrUpdateProject("foobar", newProjectSettings, callback);
    });

    it('has a project with the same properties as the new project settings', function(callback) {
        slasp.sequence([
            function(callback) {
                hydraConnector.queryProject("foobar", callback);
            },

            function(callback, project) {
                assertEqualProject(project, newProjectSettings);
                callback();
            }
        ], callback);
    });

    it('should remove the foobar project', function(callback) {
        hydraConnector.deleteProject("foobar", callback);
    });

    it('no longer has the foobar project in the overview', function(callback) {
        slasp.sequence([
            function(callback) {
                hydraConnector.queryProjects(callback);
            },

            function(callback, projects) {
                for(var i = 0; i < projects.length; i++) {
                    var project = projects[i];
                    if(project.name == "foobar") {
                        return callback("The foobar project is still in the overview");
                    }
                }

                callback();
            }
        ], callback);
    });
});
