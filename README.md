# metadoc-api

This [metadoc](https://github.com/author/metadoc) post-processor will generate a static (read-only) JSON "API" for browsing metadoc data.

The output is structured in a simple folder that can be uploaded to a static web host. However; since there is **no** `index.html` file, it's important to configure your server to use `index.json` as the default file.

The file structure will always contain:

```
/path/to/your/output
├─┬ global
│ ├── MyClassA.json
│ ├── MyClassB.json
│ └── …
├─┬ mynamespace
│ ├── MyClassC.json
│ ├── MyClassD.json
│ └── …
├── api.bus.json
├── api.classes.json
├── api.json
├── api.bus.json
├── api.namespaces.json
└── index.json
```

An example of the `index.json` (last file) may be:

```json
"full_spec_href": "https://domain.com/4.0.0/api.json",
"bus_href": "https://domain.com/4.0.0/api.bus.json",
"exceptions_href": "https://domain.com/4.0.0/api.exceptions.json",
"class_href": "https://domain.com/4.0.0/api.classes.json",
"namespace_href": "https://domain.com/4.0.0/api.namespaces.json"
}
```

## Usage

Simply run `metadoc-api` as a command in the metadoc chain. For example:

```sh
metadoc --source ./src --output ./docs | metadoc-api
```

There are two optional flags: `--root` (web root) and `--version` (API version/subfolder).

```sh
metadoc --source ./src --output ./docs | metadoc-api --root https://domain.com/ --version 2.0.0
```

The example above will produce links prefixed with `https://domain.com/2.0.0/`.

**--version auto** can be used to automatically identify the version from a local `package.json` file. The source directory will be searched for a `package.json` file first, then the current working directory.

## Guiding Principles

This is a read-only/static API, but it attempts to follow reasonable API guidelines. For example, subresources are all identified with a `href` or `_href` attribute, allowing API clients to traverse the entire API programmatically.

The API aims to be as simple as possible, but documentation websites are often more complex than they appear. To facilitate the simplest development flow possible, a few helper files are generated and put in the API root:

**index.json**
This file acts like `index.html` would in a web server, i.e. the default page served when no other is specified. It contains links to the primary resources documented in the API.

**api.json**
This is a failsafe file. It contains all of the output from metadoc, in case you can't get the detail you need from anywhere else. _WARNING:_ This file can be really, really big (10K+ lines). Use alternatives whenever possible.

**api.bus.json**
 Remember, metadoc was designed for [NGN](https://github.com/ngnjs/ngn), which is an object oriented programming library focused around a core event emitter. The bus is an event bus. This file contains all of the events triggered by an event bus. If you're not using NGN, this file may or may not be of use to you.

 **api.classes.json**

 This file contains a list of all available classes in the code being documented.

 **api.exceptions.json**

 This file contains all of the global/customer exceptions triggered by the code being documented.

 **api.namespaces.com**

 This file contains all of the namespaces recognized within the code being documented.
