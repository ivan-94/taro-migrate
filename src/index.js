const processor = require('./process')

require('./preprocess')()
require('./dependencies-upgrade')()
require('./platform-migrate')()
require('./wxApi-migrate')()
require('./config-migrate')()
require('./import-rewrite')()
require('./react-migrate')()
require('./redux-migrate')()
require('./clear-unused')()

processor.run()
