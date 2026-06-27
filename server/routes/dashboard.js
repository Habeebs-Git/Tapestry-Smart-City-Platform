const express = require('express');
const router = express.Router();
const Issue = require('../models/Issue');
const { protect } = require('../middleware/auth');

// @route   GET /api/dashboard/stats
// @desc    Get counts of total, open, resolved, critical, and in-progress issues
// @access  Private
router.get('/stats', protect, async (req, res) => {
  try {
    let filter = {};
    if (req.query.mine === 'true') {
      filter.createdBy = req.user.id;
    }

    // A resolved issue is one with status 'Resolved' or 'Verified'
    const total = await Issue.countDocuments(filter);
    const resolved = await Issue.countDocuments({ 
      ...filter, 
      status: { $in: ['Resolved', 'Verified'] } 
    });
    
    // Open issues are anything that is not Resolved or Verified
    const open = total - resolved;
    
    const critical = await Issue.countDocuments({ 
      ...filter, 
      severity: 'Critical' 
    });
    
    const inProgress = await Issue.countDocuments({ 
      ...filter, 
      status: 'In progress' 
    });

    res.json({
      total,
      open,
      resolved,
      critical,
      inProgress
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Server error while calculating statistics' });
  }
});

module.exports = router;
