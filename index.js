const path = require('path')
const fs = require('fs')
const MetadocPlugin = require('@author.io/metadoc-plugin')

class ApiGenerator extends MetadocPlugin {
  constructor () {
    super(...arguments)

    this.NAME = require(path.join(__dirname, 'package.json')).name
    this.APIROOT = '/'
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
      return `${this.APIROOT}/${ns}/index.json`.replace(/\/+/gi, '/')
    })

    fs.writeFileSync(path.join(this.mkdirp(this.output), 'index.json'), JSON.stringify({ namespaces: meta.namespaces }, null, 2))

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
}

module.exports = ApiGenerator
