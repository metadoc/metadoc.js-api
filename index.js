const path = require('path')
const fs = require('fs')
const MetadocPlugin = require('@author.io/metadoc-plugin')

class ApiGenerator extends MetadocPlugin {
  constructor () {
    super(...arguments)

    this.NAME = require(path.join(__dirname, 'package.json')).name
    this.APIROOT = this.getCLIArg('--root') || '/'

    if (this.APIROOT.trim().substr(this.APIROOT.trim().length - 1, 1) !== '/') {
      this.APIROOT = `${this.APIROOT}/`
    }

    let version = this.getCLIArg('--version') || null

    if (version) {
      if (version.toLowerCase() === 'auto') {
        try {
          version = JSON.parse(fs.readFileSync(path.join(this.source, 'package.json')).toString()).version
        } catch (e) {
          try {
            version = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json')).toString()).version
          } catch (ee) {
            throw new Error(`Could not find package.json in "${this.source}" or "${process.cwd()}". Autodetection failed.`)
            process.exit(1)
          }
        }
      }

      this.APIROOT = `${this.APIROOT}${version}/`
      this.output = path.join(this.output, version)
    }
  }

  get root () {
    return this.APIROOT
  }

  set root (value) {
    this.APIROOT = value
  }

  process () {
    this.verifyOutputDirectory()

    // Generate class data (in namespaces)
    Object.keys(this.SOURCE.namespaces).forEach(namespace => this.processNamespace(namespace, this.SOURCE.namespaces[namespace]))

    // Generate the primary manifest
    let meta = Object.assign({}, this.SOURCE)

    meta.namespaces = Object.keys(meta.namespaces).map(ns => {
      return `${this.APIROOT}/${ns}/index.json`.replace(/\/+/gi, '/').replace(':/', '://')
    })

    fs.writeFileSync(path.join(this.mkdirp(this.output), 'api.json'), JSON.stringify(this.data, null, 2))
    fs.writeFileSync(path.join(this.mkdirp(this.output), 'api.classes.json'), JSON.stringify(this.classList, null, 2))
    fs.writeFileSync(path.join(this.mkdirp(this.output), 'api.exceptions.json'), JSON.stringify(this.data.exceptions, null, 2))
    fs.writeFileSync(path.join(this.mkdirp(this.output), 'api.bus.json'), JSON.stringify(this.data.bus, null, 2))
    fs.writeFileSync(path.join(this.mkdirp(this.output), 'api.types.json'), JSON.stringify(this.data.types, null, 2))
    fs.writeFileSync(path.join(this.mkdirp(this.output), 'api.namespaces.json'), JSON.stringify(this.manifest, null, 2))
    fs.writeFileSync(path.join(this.mkdirp(this.output), 'index.json'), JSON.stringify({
      full_spec_href: `${this.APIROOT}api.json`,
      bus_href: `${this.APIROOT}api.bus.json`,
      exceptions_href: `${this.APIROOT}api.exceptions.json`,
      class_href: `${this.APIROOT}api.classes.json`,
      namespace_href: `${this.APIROOT}api.namespaces.json`,
      type_href: `${this.APIROOT}api.types.json`
    }, null, 2))

    this.emit('complete')
  }

  processNamespace (namespace, data, root = '/') {
    let dir = this.mkdirp(path.join(this.output, root, namespace))

    // Write the manifest for the namespace
    let meta = Object.assign({}, data)

    meta.classes = (Array.isArray(meta.classes) ? meta.classes : Object.keys(meta.classes || {})).map(ClassName => {
      return {
        href: `${this.APIROOT}/${ClassName.replace(/\./gi, '/')}${ClassName.split('.').pop().toLowerCase() === 'index' ? '_class' : ''}.json`.replace(/\/+/gi, '/'),
        name: ClassName
      }
    })

    meta.namespaces = Object.keys(meta.namespaces || {})

    meta.namespaces.forEach(ns => {
      meta.namespaces[ns] = `${this.APIROOT}/${root}/${ns}/index.json`.replace(/\/+/gi, '/')
    })

    if (meta.sourcefile) {
      meta.sourcefile = meta.sourcefile.replace(/\/+|\\+|\\+\/+|\/+\\+/gi, '/').replace(/\/+/gi, '/').replace('./', '')
    }

    fs.writeFileSync(path.join(dir, 'index.json'), JSON.stringify(meta, null, 2))

    // Generate the class data
    let Classes = new Set(data.classes)

    Classes.forEach(ClassName => {
      if (this.SOURCE.classes.hasOwnProperty(ClassName)) {
        let classdata = this.SOURCE.classes[ClassName]
        let name = ClassName.split('.').pop()

        name = name.toLowerCase() === 'index' ? `${name}_class` : name

        if (classdata.sourcefile) {
          classdata.sourcefile = classdata.sourcefile.replace(/\/+|\\+|\\+\/+|\/+\\+/gi, '/').replace(/\/+/gi, '/').replace('./', '')
        }

        console.log(`Writing static metadoc API file: ${path.join(dir, name + '.json').replace(process.cwd(), '.').replace(/\\/gi, '/')}`)
        fs.writeFileSync(path.join(dir, `${name}.json`), JSON.stringify(classdata, null, 2))
      } else {
        console.error(`Missing class: ${ClassName}`)
      }
    })

    meta.namespaces.forEach(subNamespace => this.processNamespace(subNamespace, data.namespaces[subNamespace], namespace.replace(/\/+/gi, '/')))
  }

  get classList () {
    let data = {}

    Object.keys(this.data.classes).forEach(cls => {
      data[cls] = {
        href: `${this.APIROOT}${cls.split('.').length === 1 ? 'global/' : ''}${cls.replace(/\./gi, '/')}.json`,
        description: this.data.classes[cls].description
      }
    })

    return data
  }

  // Generates a manifest/tree of all classes and namespaces based on the output of the process
  get manifest () {
    let data = this.data//JSON.parse(fs.readFileSync(path.join(this.output, 'api.json')))
    let namespaces = Object.assign({}, data.namespaces)
    let output = {}

    Object.keys(namespaces).forEach(namespace => {
      output = Object.assign(output, this.generateManifestNamespace(namespaces[namespace]))
    })

    return output
  }

  generateManifestNamespace (namespace, namespacePath = []) {
    let data = {}

    if (namespace) {
      namespacePath.push(namespace.label)

      data[namespace.label] = {
        href: `${this.APIROOT}${namespacePath.join('/')}/index.json`,
        description: namespace.description,
        classes: namespace.classes.map(cls => {
          return {
            name: cls,
            href: `${this.APIROOT}${namespacePath.join('/')}/${cls.replace(namespacePath.join('.') + '.', '')}.json`
          }
        }),
        namespaces: {}
      }

      Object.keys(namespace.namespaces).forEach(ns => {
        let subspace = this.generateManifestNamespace(namespace.namespaces[ns], namespacePath.slice(0))
        data[namespace.label].namespaces = Object.assign(data[namespace.label].namespaces, subspace)
      })
    }

    return data
  }
}

module.exports = ApiGenerator
