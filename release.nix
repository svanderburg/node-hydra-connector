{ nixpkgs ? <nixpkgs>
, systems ? [ "x86_64-linux" "x86_64-darwin" ]
, officialRelease ? false
}:

let
  pkgs = import nixpkgs {};

  version = (builtins.fromJSON (builtins.readFile ./package.json)).version;

  jobset = import ./default.nix {
    inherit pkgs;
    system = builtins.currentSystem;
  };

  jobs = rec {
    inherit (jobset) tarball;

    package = pkgs.lib.genAttrs systems (system:
      (import ./default.nix {
        pkgs = import nixpkgs { inherit system; };
        inherit system;
      }).package.override {
        postInstall = ''
          mkdir -p $out/share/doc/node-hydra-connector
          $out/lib/node_modules/node-hydra-connector/node_modules/jsdoc/jsdoc.js -R README.md -r lib -d $out/share/doc/node-hydra-connector/apidox
          mkdir -p $out/nix-support
          echo "doc api $out/share/doc/node-hydra-connector/apidox" >> $out/nix-support/hydra-build-products
        '';
      }
    );
  };
in
jobs
