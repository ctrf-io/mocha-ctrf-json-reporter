import GenerateCtrfReport = require('./generate-report')
import { ctrf, extra } from './runtime'

export = Object.assign(GenerateCtrfReport, { ctrf, extra })
