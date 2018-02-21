jest.mock('./cozyclient', () => ({
  data: {
    query: jest.fn(),
    defineIndex: jest.fn()
  }
}))

const cozy = require('./cozyclient')
const hydrateAndFilter = require('./hydrateAndFilter')

class Document {
  constructor (attributes) {
    if (this.validate) {
      this.validate(attributes)
    }
    Object.assign(this, attributes, {
      metadata: {
        version: this.constructor.version
      }
    })
  }

  toJSON () {
    return this
  }
}

const asyncResolve = data => (
  new Promise(resolve => setImmediate(() => resolve(data)))
)

const basicEntries = [
  {name: 'Marge'},
  {name: 'Homer'},
  {name: 'Bart'},
  {name: 'Lisa'},
  {name: 'Maggie'},
]

const copy = data => JSON.parse(JSON.stringify(data))

describe('hydrate and filter', () => {
  let entries, filtered
  beforeEach(async () => {
    cozy.data.query.mockReturnValue(asyncResolve([
      {_id: 1, name: 'Marge', _rev: 2},
      {_id: 2, name: 'Homer', _rev: 3}
    ]))
    cozy.data.defineIndex.mockReturnValue(asyncResolve())
  })

  const setup = async _entries => {
  }

  it('should hydrate entries with info from db', async () => {
    entries = copy(basicEntries)
    filtered = await hydrateAndFilter(entries, 'io.cozy.simpsons', { keys: ['name'] })
    expect(entries[0]._id).toBe(1)
    expect(entries[0]._rev).toBe(2)
    expect(entries[1]._id).toBe(2)
    expect(entries[1]._rev).toBe(3)
    expect(filtered.length).toBe(3)
  })

  it('should support shouldSave / shouldUpdate as options', async () => {
    entries = copy(basicEntries)
    filtered = await hydrateAndFilter(entries, 'io.cozy.simpsons', {
      keys: ['name'],
      shouldSave: entry => {
        return entry.name !== 'Bart'
      },
      shouldUpdate: (entry, existing) => {
        return entry.name === 'Marge'
      }
    })
    expect(filtered.filter(x => x.name == 'Bart').length).toBe(0)
    expect(filtered.filter(x => x.name == 'Marge').length).toBe(1)
  })

  it('should support shouldSave / shouldUpdate in the entries', async () => {
    class Simpson extends Document {
      shouldSave () {
        return this.name !== 'Bart'
      }

      shouldUpdate () {
        return this.name === 'Marge'
      }
    }

    entries = copy(basicEntries).map(x => new Simpson(x))
    filtered = await hydrateAndFilter(entries, 'io.cozy.simpsons', {
      keys: ['name']
    })
    expect(filtered.filter(x => x.name == 'Bart').length).toBe(0)
    expect(filtered.filter(x => x.name == 'Marge').length).toBe(1)
  })
})