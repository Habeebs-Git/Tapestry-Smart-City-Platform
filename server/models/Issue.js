const mongoose = require('mongoose');

const IssueSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true, 
    trim: true 
  },
  description: { 
    type: String, 
    trim: true,
    default: ''
  },
  category: { 
    type: String, 
    enum: ['Potholes', 'Garbage', 'Water Leakage', 'Broken Streetlights', 'Drainage Issues', 'Damaged Sidewalks', 'Road Cracks', 'Public Safety Hazards', 'Other'], 
    default: 'Other' 
  },
  severity: { 
    type: String, 
    enum: ['Low', 'Medium', 'High', 'Critical'], 
    default: 'Medium' 
  },
  imageUrl: { 
    type: String, 
    default: '' 
  },
  location: { 
    type: String, 
    default: '' 
  },
  status: { 
    type: String, 
    enum: ['Reported', 'Verified', 'Assigned', 'In progress', 'Resolved'], 
    default: 'Reported' 
  },
  estimatedCost: { 
    type: Number, 
    default: null 
  },
  assignee: { 
    type: String, 
    default: '' 
  },
  votes: { 
    type: Number, 
    default: 0 
  },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  createdByName: { 
    type: String, 
    required: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
}, {
  toJSON: {
    virtuals: true,
    transform: function (doc, ret) {
      ret.id = ret._id.toString();
      // Ensure createdBy is also represented as a string if it's an object
      if (ret.createdBy && ret.createdBy.toString) {
        ret.createdBy = ret.createdBy.toString();
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
      if (ret.createdBy && ret.createdBy.toString) {
        ret.createdBy = ret.createdBy.toString();
      }
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

module.exports = mongoose.model('Issue', IssueSchema);
