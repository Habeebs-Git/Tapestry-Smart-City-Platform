const mongoose = require('mongoose');

const UpdateSchema = new mongoose.Schema({
  issueId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Issue', 
    required: true 
  },
  status: { 
    type: String, 
    required: true 
  },
  notes: { 
    type: String, 
    default: '' 
  },
  timestamp: { 
    type: Date, 
    default: Date.now 
  }
}, {
  toJSON: {
    virtuals: true,
    transform: function (doc, ret) {
      ret.id = ret._id.toString();
      if (ret.issueId && ret.issueId.toString) {
        ret.issueId = ret.issueId.toString();
      }
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  },
  toObject: {
    virtuals: true,
    transform: function (doc, ret) {
      ret.id = ret._id.toString();
      if (ret.issueId && ret.issueId.toString) {
        ret.issueId = ret.issueId.toString();
      }
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

module.exports = mongoose.model('Update', UpdateSchema);
