const express = require('express');
const router = express.Router();
const Issue = require('../models/Issue');
const Update = require('../models/Update');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// @route   POST /api/issues
// @desc    Create a new issue
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { title, description, category, severity, imageUrl, location, estimatedCost } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Issue title is required' });
    }

    // Create the issue
    const issue = await Issue.create({
      title,
      description: description || '',
      category: category || 'Other',
      severity: severity || 'Medium',
      imageUrl: imageUrl || '',
      location: location || '',
      estimatedCost: estimatedCost || null,
      createdBy: req.user.id,
      createdByName: req.user.name,
      status: 'Reported',
      assignee: '',
      votes: 0
    });

    // Create initial timeline audit ledger log
    await Update.create({
      issueId: issue.id,
      status: 'Reported',
      notes: `Issue submitted by ${req.user.name}.`
    });

    // Reward reputation points to the citizen (50 points)
    await User.findByIdAndUpdate(req.user.id, {
      $inc: { reputation: 50 }
    });

    res.status(201).json(issue);
  } catch (error) {
    console.error('Create issue error:', error);
    res.status(500).json({ error: 'Server error while reporting issue' });
  }
});

// @route   GET /api/issues
// @desc    Get all issues (optionally filter by current user)
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    let filter = {};
    if (req.query.mine === 'true') {
      filter.createdBy = req.user.id;
    }

    // Retrieve issues sorted by newest first
    const issues = await Issue.find(filter).sort({ createdAt: -1 });
    res.json(issues);
  } catch (error) {
    console.error('Fetch issues error:', error);
    res.status(500).json({ error: 'Server error while fetching issues' });
  }
});

// @route   GET /api/issues/:id
// @desc    Get a single issue by ID
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) {
      return res.status(404).json({ error: 'Issue not found' });
    }
    res.json(issue);
  } catch (error) {
    console.error('Fetch single issue error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ error: 'Issue not found' });
    }
    res.status(500).json({ error: 'Server error while fetching issue' });
  }
});

// @route   PUT /api/issues/:id
// @desc    Update an issue and log status changes to the ledger
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    const changes = req.body;
    const notesList = [];

    // Track status change notes
    if (changes.status && changes.status !== issue.status) {
      notesList.push(`Status → ${changes.status}`);
    }

    // Track assignee change notes
    if (changes.assignee !== undefined && changes.assignee !== issue.assignee) {
      if (changes.assignee) {
        notesList.push(`Assigned to ${changes.assignee}`);
      } else {
        notesList.push('Assignment cleared');
      }
    }

    // Apply changes and save
    const updatedIssue = await Issue.findByIdAndUpdate(
      req.params.id,
      { $set: changes },
      { new: true, runValidators: true }
    );

    // If there is a status/assignee change, or custom notes are supplied, create ledger log
    if (notesList.length > 0 || changes.notes) {
      await Update.create({
        issueId: updatedIssue.id,
        status: updatedIssue.status,
        notes: changes.notes || notesList.join(' · ')
      });
    }

    res.json(updatedIssue);
  } catch (error) {
    console.error('Update issue error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ error: 'Issue not found' });
    }
    res.status(500).json({ error: 'Server error while updating issue' });
  }
});

// @route   GET /api/issues/:id/updates
// @desc    Get status ledger updates for an issue
// @access  Private
router.get('/:id/updates', protect, async (req, res) => {
  try {
    const updates = await Update.find({ issueId: req.params.id }).sort({ timestamp: 1 });
    res.json(updates);
  } catch (error) {
    console.error('Fetch updates error:', error);
    res.status(500).json({ error: 'Server error while fetching issue ledger history' });
  }
});

module.exports = router;
