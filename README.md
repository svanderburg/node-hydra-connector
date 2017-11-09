node-hydra-connector
====================
Remotely control [Hydra](http://nixos.org/hydra): a Nix-based continuous
integration server by invoking its REST API from a Node.js application.

API usage
=========
Instantiate a `HydraConnector` object and then call any of the supported
operations.

The following example code connects to a Hydra instance running on `localhost`,
queries all projects and displays their names:

```javascript
var HydraConnector = require('hydra-connector').HydraConnector;

hydraConnector = new HydraConnector("http://localhost");

hydraConnector.queryProjects(function(err, projects) {
    if(err) {
        console.log("Some error occurred: "+err);
    } else {
        for(var i = 0; i < projects.length; i++) {
            var project = projects[i];
            console.log("Project: "+project.name);
        }
    }
});
```

Some operations, e.g. the write operations require user authentication.
By invoking the `login()` method, we can authenticate ourselves:

```javascript
hydraConnector.login("admin", "myverysecretpassword", function(err) {
    if(err) {
        console.log("Login succeeded!");
    } else {
        console.log("Some error occurred: "+err);
    }
});
```

Likewise, we can also logout by invoking:

```javascript
hydraConnector.logout(function(err) {
    if(err) {
        console.log("Logout succeeded!");
    } else {
        console.log("Some error occurred: "+err);
    }
});
```

A private Hydra server may be hidden behind a reverse proxy that requires HTTP
basic authentication. To authenticate, we can provide the HTTP basic credentials
to the `HydraConnector` constructor:

```javascript
var HydraConnector = require('hydra-connector').HydraConnector;

hydraConnector = new HydraConnector("http://localhost", "sander", "12345"); // HTTP basic credentials
```

API documentation
=================
This package includes API documentation, which can be generated with
[JSDoc](http://usejsdoc.org).

License
=======
MIT
