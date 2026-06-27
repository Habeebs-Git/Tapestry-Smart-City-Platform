const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Issue = require('../models/Issue');
const Update = require('../models/Update');

// @route   POST /api/seed
// @desc    Seed the database with sample users, issues, and audit history
// @access  Public
router.post('/', async (req, res) => {
  try {
    // 1. Check if database already has users
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      return res.json({ message: 'Database is already seeded' });
    }

    console.log('Seeding database with default accounts...');

    // 2. Hash passwords
    const adminPassword = await bcrypt.hash('admin123', 10);
    const contractorPassword = await bcrypt.hash('work123', 10);
    const citizenPassword = await bcrypt.hash('demo123', 10);

    // 3. Create default users
    const admin = await User.create({
      name: 'City Admin',
      email: 'admin@tapestry.ai',
      password: adminPassword,
      role: 'admin',
      reputation: 0
    });

    const contractor = await User.create({
      name: 'MetroFix Co.',
      email: 'contractor@tapestry.ai',
      password: contractorPassword,
      role: 'contractor',
      reputation: 0
    });

    const citizen = await User.create({
      name: 'Jordan Rivera',
      email: 'citizen@tapestry.ai',
      password: citizenPassword,
      role: 'citizen',
      reputation: 250 // Reflects 5 reports @ 50 rep points each
    });

    console.log('Default accounts created. Seeding sample issues...');

    // 4. Sample issue templates
    const seedIssues = [
      { 
        title: 'Deep pothole on 5th Ave', 
        category: 'Potholes', 
        severity: 'High', 
        status: 'In progress', 
        location: '40.7411 N, 73.9897 W · Ward 7', 
        estimatedCost: 1240, 
        assignee: 'MetroFix Co.' 
      },
      { 
        title: 'Major water main leak', 
        category: 'Water Leakage', 
        severity: 'Critical', 
        status: 'Assigned', 
        location: 'Ward 4 · Park Rd', 
        estimatedCost: 6800, 
        assignee: 'AquaFix Crew' 
      },
      { 
        title: 'Broken streetlight, Elm St', 
        category: 'Broken Streetlights', 
        severity: 'Medium', 
        status: 'Resolved', 
        location: 'Ward 7 · Elm St', 
        estimatedCost: 320, 
        assignee: 'BrightLight Ltd.' 
      },
      { 
        title: 'Overflowing bins, Market Sq', 
        category: 'Garbage', 
        severity: 'Low', 
        status: 'Resolved', 
        location: 'Ward 7 · Market Sq', 
        estimatedCost: 90, 
        assignee: 'Sanitation Dept.' 
      },
      { 
        title: 'Road cracks, Hill Rd', 
        category: 'Road Cracks', 
        severity: 'High', 
        status: 'Reported', 
        location: 'Ward 9 · Hill Rd', 
        estimatedCost: 540, 
        assignee: '' 
      }
    ];

    // 5. Populate issues and their timelines
    for (let idx = 0; idx < seedIssues.length; idx++) {
      const d = seedIssues[idx];
      const createdDate = new Date(Date.now() - (idx + 1) * 86400000);
      
      const issue = await Issue.create({
        title: d.title,
        description: 'Auto-seeded sample report for demonstration.',
        category: d.category,
        severity: d.severity,
        imageUrl: '',
        location: d.location,
        status: d.status,
        estimatedCost: d.estimatedCost,
        assignee: d.assignee,
        votes: Math.floor(Math.random() * 120),
        createdBy: citizen.id,
        createdByName: citizen.name,
        createdAt: createdDate
      });

      // Insert "Reported" initial log
      await Update.create({
        issueId: issue.id,
        status: 'Reported',
        notes: `Issue submitted by ${citizen.name}.`,
        timestamp: createdDate
      });

      // Insert "Assigned" intermediate log if applicable
      if (d.assignee) {
        await Update.create({
          issueId: issue.id,
          status: 'Assigned',
          notes: `Assigned to ${d.assignee}`,
          timestamp: new Date(createdDate.getTime() + 3600000)
        });
      }

      // Insert "Resolved" final log if applicable
      if (d.status === 'Resolved') {
        await Update.create({
          issueId: issue.id,
          status: 'Resolved',
          notes: 'Repair completed and verified.',
          timestamp: new Date(createdDate.getTime() + 7200000)
        });
      }
    }

    console.log('Seeding completed successfully');
    res.json({ message: 'Database seeded successfully' });
  } catch (error) {
    console.error('Database seeding error:', error);
    res.status(500).json({ error: 'Server error during database seeding' });
  }
});

module.exports = router;
