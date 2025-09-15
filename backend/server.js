const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3001;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// File paths for persistence
const DATA_DIR = path.join(__dirname, 'data');
const POSTS_FILE = path.join(DATA_DIR, 'posts.json');
const PROFILES_FILE = path.join(DATA_DIR, 'profiles.json');
const REACTIONS_FILE = path.join(DATA_DIR, 'reactions.json');
const COMMENTS_FILE = path.join(DATA_DIR, 'comments.json');
const POLLS_FILE = path.join(DATA_DIR, 'polls.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  console.log('📁 Created data directory for persistence');
}

// Load data from files
const loadData = (filePath, defaultValue = []) => {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
    return defaultValue;
  } catch (error) {
    console.error(`Error loading ${filePath}:`, error);
    return defaultValue;
  }
};

// Save data to files
const saveData = (filePath, data) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`Error saving ${filePath}:`, error);
    return false;
  }
};

// Initialize data from files
let posts = loadData(POSTS_FILE, []);
let reactions = loadData(REACTIONS_FILE, {});
let comments = loadData(COMMENTS_FILE, {});
let profiles = loadData(PROFILES_FILE, {});
let polls = loadData(POLLS_FILE, []);

console.log('🚀 MonadSocial Backend Server Starting with File Persistence...');
console.log(`📊 Loaded ${posts.length} posts, ${Object.keys(profiles).length} profiles, ${polls.length} polls from storage`);

// Enhanced auto-save function
const autoSave = () => {
  console.log('💾 Auto-saving data...');
  const results = [
    saveData(POSTS_FILE, posts),
    saveData(PROFILES_FILE, profiles),
    saveData(REACTIONS_FILE, reactions),
    saveData(COMMENTS_FILE, comments),
    saveData(POLLS_FILE, polls)
  ];
  
  const successCount = results.filter(r => r).length;
  console.log(`💾 Auto-save completed: ${successCount}/5 files saved successfully`);
  
  if (successCount < 5) {
    console.error('⚠️  Some files failed to save! Check disk space and permissions.');
  }
};

// Auto-save every 30 seconds
setInterval(autoSave, 30000);

// Save on process exit
process.on('SIGTERM', () => {
  console.log('💾 Saving data before shutdown...');
  autoSave();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('💾 Saving data before shutdown...');
  autoSave();
  process.exit(0);
});

// ===== USER PROFILE ENDPOINTS =====

// Get user profile
app.get('/profiles/:address', (req, res) => {
  try {
    const { address } = req.params;
    const userAddress = address.toLowerCase();
    
    if (profiles[userAddress]) {
      console.log(`👤 GET /profiles/${address.slice(0, 8)}... - Profile found: ${profiles[userAddress].displayName}`);
      res.json(profiles[userAddress]);
    } else {
      console.log(`👤 GET /profiles/${address.slice(0, 8)}... - No profile found`);
      res.status(404).json({ error: 'Profile not found' });
    }
  } catch (error) {
    console.error('Error getting profile:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Create/Update user profile
app.post('/profiles/:address', (req, res) => {
  try {
    const { address } = req.params;
    const { displayName, profilePhoto, bio, txHash, blockNumber, profileFeesPaid } = req.body;
    const userAddress = address.toLowerCase();
    
    if (!displayName) {
      return res.status(400).json({ error: 'Display name is required' });
    }
    
    const profile = {
      address: userAddress,
      displayName: displayName,
      profilePhoto: profilePhoto || null,
      bio: bio || '',
      joinedDate: profiles[userAddress]?.joinedDate || new Date().toISOString(),
      updatedDate: new Date().toISOString(),
      txHash: txHash || null,
      blockNumber: blockNumber || null,
      profileFeesPaid: profileFeesPaid || null
    };
    
    profiles[userAddress] = profile;
    
    // Save immediately for important profile updates
    saveData(PROFILES_FILE, profiles);
    
    console.log(`👤 POST /profiles/${address.slice(0, 8)}... - Profile ${profiles[userAddress]?.displayName ? 'updated' : 'created'}: "${displayName}"`);
    if (txHash) {
      console.log(`   🔗 Blockchain TX: ${txHash.slice(0, 16)}... | Fee: ${profileFeesPaid}`);
    }
    
    res.json({ success: true, profile });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get all profiles
app.get('/profiles', (req, res) => {
  try {
    const allProfiles = Object.values(profiles);
    console.log(`👤 GET /profiles - Returning ${allProfiles.length} profiles`);
    res.json(allProfiles);
  } catch (error) {
    console.error('Error getting all profiles:', error);
    res.status(500).json({ error: 'Failed to get profiles' });
  }
});

// ===== POST ENDPOINTS =====

// Get all posts with author profile information
app.get('/posts', (req, res) => {
  try {
    const enhancedPosts = posts.map(post => {
      const postReactions = reactions[post.id] || { likes: 0, likedBy: [] };
      const postComments = comments[post.id] || [];
      const authorProfile = profiles[post.author.toLowerCase()] || null;
      
      return {
        ...post,
        likes: postReactions.likes,
        likedBy: postReactions.likedBy,
        comments: postComments.length,
        commentsList: postComments,
        authorProfile: authorProfile
      };
    });
    
    console.log(`📚 GET /posts - Returning ${enhancedPosts.length} posts with profile data`);
    res.json(enhancedPosts);
  } catch (error) {
    console.error('Error getting posts:', error);
    res.status(500).json({ error: 'Failed to get posts' });
  }
});

// Create new post
app.post('/posts', (req, res) => {
  try {
    const { id, content, photo, author, timestamp, txHash, blockNumber } = req.body;
    
    if (!content || !author || !id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const newPost = {
      id,
      content,
      photo: photo || null,
      author,
      timestamp: timestamp || Math.floor(Date.now() / 1000),
      txHash,
      blockNumber
    };
    
    posts.unshift(newPost);
    reactions[id] = { likes: 0, likedBy: [] };
    comments[id] = [];
    
    // Save immediately for new posts
    autoSave();
    
    const authorProfile = profiles[author.toLowerCase()];
    const displayName = authorProfile?.displayName || `User ${author.slice(-4)}`;
    
    console.log(`📝 POST /posts - New post by ${displayName} (${author.slice(0, 8)}...)`);
    console.log(`   Content: "${content.slice(0, 50)}${content.length > 50 ? '...' : ''}"`);
    if (txHash) {
      console.log(`   🔗 Blockchain TX: ${txHash.slice(0, 16)}...`);
    }
    
    res.json({ success: true, post: newPost });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// Like/unlike post
app.post('/posts/:postId/like', (req, res) => {
  try {
    const { postId } = req.params;
    const { user } = req.body;
    
    if (!user) {
      return res.status(400).json({ error: 'User address required' });
    }
    
    const userAddress = user.toLowerCase();
    
    const post = posts.find(p => p.id === postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    if (!reactions[postId]) {
      reactions[postId] = { likes: 0, likedBy: [] };
    }
    
    const postReactions = reactions[postId];
    const hasLiked = postReactions.likedBy.includes(userAddress);
    
    const userProfile = profiles[userAddress];
    const displayName = userProfile?.displayName || `User ${userAddress.slice(-4)}`;
    
    if (hasLiked) {
      postReactions.likes = Math.max(0, postReactions.likes - 1);
      postReactions.likedBy = postReactions.likedBy.filter(addr => addr !== userAddress);
      console.log(`👎 Unlike from ${displayName} on post ${postId.slice(-8)}`);
    } else {
      postReactions.likes += 1;
      postReactions.likedBy.push(userAddress);
      console.log(`👍 Like from ${displayName} on post ${postId.slice(-8)}`);
    }
    
    // Save reactions
    saveData(REACTIONS_FILE, reactions);
    
    res.json({ 
      success: true, 
      likes: postReactions.likes,
      userHasLiked: !hasLiked
    });
  } catch (error) {
    console.error('Error toggling like:', error);
    res.status(500).json({ error: 'Failed to toggle like' });
  }
});

// Add comment to post
app.post('/posts/:postId/comments', (req, res) => {
  try {
    const { postId } = req.params;
    const { id, author, text, timestamp } = req.body;
    
    if (!author || !text) {
      return res.status(400).json({ error: 'Author and text required' });
    }
    
    const post = posts.find(p => p.id === postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    const comment = {
      id: id || `${postId}_${author}_${Date.now()}`,
      postId,
      author,
      text,
      timestamp: timestamp || Math.floor(Date.now() / 1000)
    };
    
    if (!comments[postId]) {
      comments[postId] = [];
    }
    
    comments[postId].push(comment);
    
    // Save comments
    saveData(COMMENTS_FILE, comments);
    
    const authorProfile = profiles[author.toLowerCase()];
    const displayName = authorProfile?.displayName || `User ${author.slice(-4)}`;
    
    console.log(`💬 Comment by ${displayName} on post ${postId.slice(-8)}: "${text.slice(0, 30)}${text.length > 30 ? '...' : ''}"`);
    
    res.json({ success: true, comment });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// Delete post
app.delete('/posts/:postId', (req, res) => {
  try {
    const { postId } = req.params;
    const { user } = req.body;
    
    if (!user) {
      return res.status(400).json({ error: 'User address required' });
    }
    
    const postIndex = posts.findIndex(p => p.id === postId);
    if (postIndex === -1) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    const post = posts[postIndex];
    
    if (post.author.toLowerCase() !== user.toLowerCase()) {
      return res.status(403).json({ error: 'Can only delete own posts' });
    }
    
    posts.splice(postIndex, 1);
    delete reactions[postId];
    delete comments[postId];
    
    // Save after deletion
    autoSave();
    
    const userProfile = profiles[user.toLowerCase()];
    const displayName = userProfile?.displayName || `User ${user.slice(-4)}`;
    
    console.log(`🗑️ Post deleted by ${displayName} (${postId.slice(-8)})`);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// ===== POLL ENDPOINTS =====

// Get all polls with author profile information
app.get('/polls', (req, res) => {
  try {
    const enhancedPolls = polls.map(poll => {
      const authorProfile = profiles[poll.author.toLowerCase()] || null;
      
      return {
        ...poll,
        authorProfile: authorProfile,
        isActive: poll.endTime > Date.now()
      };
    });
    
    console.log(`🗳️  GET /polls - Returning ${enhancedPolls.length} polls with profile data`);
    res.json(enhancedPolls);
  } catch (error) {
    console.error('Error getting polls:', error);
    res.status(500).json({ error: 'Failed to get polls' });
  }
});

// Create new poll
app.post('/polls', (req, res) => {
  try {
    const { id, question, options, duration, endTime, author, timestamp, txHash } = req.body;
    
    if (!question || !author || !id || !options || options.length < 2) {
      return res.status(400).json({ error: 'Missing required fields or insufficient options' });
    }
    
    const newPoll = {
      id,
      question,
      options: options.map((option, index) => ({
        id: index,
        text: option.text || option,
        votes: 0,
        percentage: 0,
        voters: []
      })),
      duration: duration || 24,
      endTime: endTime || (Date.now() + (24 * 60 * 60 * 1000)),
      author,
      totalVotes: 0,
      isActive: true,
      timestamp: timestamp || Math.floor(Date.now() / 1000),
      txHash
    };
    
    polls.unshift(newPoll);
    
    // Save immediately for new polls
    if (!saveData(POLLS_FILE, polls)) {
      return res.status(500).json({ error: 'Failed to save poll' });
    }
    
    const authorProfile = profiles[author.toLowerCase()];
    const displayName = authorProfile?.displayName || `User ${author.slice(-4)}`;
    
    console.log(`🗳️  POST /polls - New poll by ${displayName} (${author.slice(0, 8)}...)`);
    console.log(`   Question: "${question}"`);
    console.log(`   Options: ${options.length}`);
    console.log(`   Total polls now: ${polls.length}`);
    
    res.json({ success: true, poll: newPoll });
  } catch (error) {
    console.error('Error creating poll:', error);
    res.status(500).json({ error: 'Failed to create poll' });
  }
});

// Vote on poll
app.post('/polls/:pollId/vote', (req, res) => {
  try {
    const { pollId } = req.params;
    const { user, optionId } = req.body;
    
    if (!user || optionId === undefined) {
      return res.status(400).json({ error: 'User address and option ID required' });
    }
    
    const userAddress = user.toLowerCase();
    
    const pollIndex = polls.findIndex(p => p.id === pollId);
    if (pollIndex === -1) {
      return res.status(404).json({ error: 'Poll not found' });
    }
    
    const poll = polls[pollIndex];
    
    // Check if poll is still active
    if (poll.endTime <= Date.now()) {
      return res.status(400).json({ error: 'Poll has ended' });
    }
    
    // Check if option exists
    if (!poll.options[optionId]) {
      return res.status(400).json({ error: 'Invalid option ID' });
    }
    
    // Remove previous vote if exists
    poll.options.forEach(option => {
      const voterIndex = option.voters.indexOf(userAddress);
      if (voterIndex > -1) {
        option.voters.splice(voterIndex, 1);
        option.votes = Math.max(0, option.votes - 1);
      }
    });
    
    // Add new vote
    poll.options[optionId].voters.push(userAddress);
    poll.options[optionId].votes += 1;
    
    // Recalculate total votes and percentages
    poll.totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes, 0);
    poll.options.forEach(option => {
      option.percentage = poll.totalVotes > 0 ? Math.round((option.votes / poll.totalVotes) * 100) : 0;
    });
    
    // Update the poll in the array
    polls[pollIndex] = poll;
    
    // Save votes
    if (!saveData(POLLS_FILE, polls)) {
      return res.status(500).json({ error: 'Failed to save vote' });
    }
    
    const userProfile = profiles[userAddress];
    const displayName = userProfile?.displayName || `User ${userAddress.slice(-4)}`;
    
    console.log(`🗳️  Vote from ${displayName} on poll ${pollId.slice(-8)} for option ${optionId}`);
    
    res.json({ 
      success: true, 
      poll: poll,
      message: 'Vote recorded successfully'
    });
  } catch (error) {
    console.error('Error voting on poll:', error);
    res.status(500).json({ error: 'Failed to record vote' });
  }
});

// Get specific poll
app.get('/polls/:pollId', (req, res) => {
  try {
    const { pollId } = req.params;
    
    const poll = polls.find(p => p.id === pollId);
    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }
    
    const authorProfile = profiles[poll.author.toLowerCase()] || null;
    const enhancedPoll = {
      ...poll,
      authorProfile: authorProfile,
      isActive: poll.endTime > Date.now()
    };
    
    res.json(enhancedPoll);
  } catch (error) {
    console.error('Error getting poll:', error);
    res.status(500).json({ error: 'Failed to get poll' });
  }
});

// Delete poll (only by author)
app.delete('/polls/:pollId', (req, res) => {
  try {
    const { pollId } = req.params;
    const { user } = req.body;
    
    if (!user) {
      return res.status(400).json({ error: 'User address required' });
    }
    
    const pollIndex = polls.findIndex(p => p.id === pollId);
    if (pollIndex === -1) {
      return res.status(404).json({ error: 'Poll not found' });
    }
    
    const poll = polls[pollIndex];
    
    if (poll.author.toLowerCase() !== user.toLowerCase()) {
      return res.status(403).json({ error: 'Can only delete own polls' });
    }
    
    polls.splice(pollIndex, 1);
    
    // Save after deletion
    if (!saveData(POLLS_FILE, polls)) {
      return res.status(500).json({ error: 'Failed to save after deletion' });
    }
    
    const userProfile = profiles[user.toLowerCase()];
    const displayName = userProfile?.displayName || `User ${user.slice(-4)}`;
    
    console.log(`🗑️ Poll deleted by ${displayName} (${pollId.slice(-8)})`);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting poll:', error);
    res.status(500).json({ error: 'Failed to delete poll' });
  }
});

// ===== UTILITY ENDPOINTS =====

// Health check
app.get('/health', (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    data: {
      posts: posts.length,
      profiles: Object.keys(profiles).length,
      polls: polls.length
    },
    storage: {
      directory: DATA_DIR,
      files: [POSTS_FILE, PROFILES_FILE, REACTIONS_FILE, COMMENTS_FILE, POLLS_FILE].map(f => ({
        name: path.basename(f),
        exists: fs.existsSync(f),
        size: fs.existsSync(f) ? fs.statSync(f).size : 0
      }))
    }
  };
  
  res.json(health);
});

// Enhanced stats endpoint
app.get('/stats', (req, res) => {
  try {
    const totalLikes = Object.values(reactions).reduce((sum, r) => sum + r.likes, 0);
    const totalComments = Object.values(comments).reduce((sum, c) => sum + c.length, 0);
    const totalProfiles = Object.keys(profiles).length;
    const activeUsers = [...new Set(posts.map(p => p.author))].length;
    const totalVotes = polls.reduce((sum, poll) => sum + poll.totalVotes, 0);
    const activePolls = polls.filter(poll => poll.endTime > Date.now()).length;
    
    res.json({
      totalPosts: posts.length,
      totalLikes,
      totalComments,
      totalProfiles,
      activeUsers,
      totalPolls: polls.length,
      activePolls,
      totalVotes,
      profilesWithPhotos: Object.values(profiles).filter(p => p.profilePhoto).length,
      profilesWithBlockchainTx: Object.values(profiles).filter(p => p.txHash).length,
      averagePostsPerUser: activeUsers > 0 ? Math.round((posts.length / activeUsers) * 100) / 100 : 0,
      dataFiles: {
        posts: POSTS_FILE,
        profiles: PROFILES_FILE,
        reactions: REACTIONS_FILE,
        comments: COMMENTS_FILE,
        polls: POLLS_FILE
      }
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Enhanced backup endpoint
app.post('/backup', (req, res) => {
  try {
    const backup = {
      posts,
      profiles,
      reactions,
      comments,
      polls,
      timestamp: new Date().toISOString()
    };
    
    const backupFile = path.join(DATA_DIR, `backup_${Date.now()}.json`);
    saveData(backupFile, backup);
    
    console.log(`💾 Backup created: ${backupFile}`);
    res.json({ 
      success: true, 
      backupFile, 
      totalData: { 
        posts: posts.length, 
        profiles: Object.keys(profiles).length,
        polls: polls.length 
      } 
    });
  } catch (error) {
    console.error('Error creating backup:', error);
    res.status(500).json({ error: 'Failed to create backup' });
  }
});

// ADD THIS TO YOUR backend/server.js file (after existing routes, before app.listen())

// PATCH endpoint for updating posts
app.patch('/api/posts/:id', async (req, res) => {
  try {
    const postId = req.params.id;
    const { content, user } = req.body;
    
    if (!user) {
      return res.status(400).json({ error: 'User address required' });
    }
    
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Content cannot be empty' });
    }
    
    // Find the post to update
    const postIndex = posts.findIndex(post => post.id === postId);
    
    if (postIndex === -1) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    const post = posts[postIndex];
    
    // Check if user owns the post
    if (post.author.toLowerCase() !== user.toLowerCase()) {
      return res.status(403).json({ error: 'Can only edit own posts' });
    }
    
    // Update the post
    posts[postIndex] = {
      ...post,
      content: content.trim(),
      updatedAt: Math.floor(Date.now() / 1000),
      isEdited: true
    };
    
    // Save immediately
    saveData(POSTS_FILE, posts);
    
    const userProfile = profiles[user.toLowerCase()];
    const displayName = userProfile?.displayName || `User ${user.slice(-4)}`;
    
    console.log(`✏️ Post edited by ${displayName} (${postId.slice(-8)})`);
    
    res.json({ 
      success: true, 
      message: 'Post updated successfully',
      post: posts[postIndex]
    });
    
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({ error: 'Failed to update post' });
  }
});

// If you want saved posts functionality, add this too:
app.post('/api/saved-posts/:address', async (req, res) => {
  try {
    const userAddress = req.params.address.toLowerCase();
    const { postId, action } = req.body;
    
    let savedPosts = {};
    const savedPostsPath = path.join(__dirname, 'data', 'saved-posts.json');
    
    if (fs.existsSync(savedPostsPath)) {
      savedPosts = JSON.parse(fs.readFileSync(savedPostsPath, 'utf8'));
    }
    
    if (!savedPosts[userAddress]) {
      savedPosts[userAddress] = [];
    }
    
    if (action === 'save') {
      if (!savedPosts[userAddress].includes(postId)) {
        savedPosts[userAddress].push(postId);
      }
    } else if (action === 'unsave') {
      savedPosts[userAddress] = savedPosts[userAddress].filter(id => id !== postId);
    }
    
    fs.writeFileSync(savedPostsPath, JSON.stringify(savedPosts, null, 2));
    
    res.json({ 
      success: true, 
      message: `Post ${action}d successfully`,
      savedPosts: savedPosts[userAddress]
    });
    
  } catch (error) {
    console.error('Error saving/unsaving post:', error);
    res.status(500).json({ error: 'Failed to update saved posts' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ MonadSocial Backend Server running on http://localhost:${PORT}`);
  console.log(`💾 Data persistence: ${DATA_DIR}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📈 Stats: http://localhost:${PORT}/stats`);
  console.log(`💾 Backup: http://localhost:${PORT}/backup`);
  console.log('');
  console.log('🔗 API Endpoints:');
  console.log('   📝 Posts: GET/POST /posts, POST /posts/:id/like, POST /posts/:id/comments, DELETE /posts/:id');
  console.log('   👤 Profiles: GET/POST /profiles/:address, GET /profiles');
  console.log('   🗳️  Polls: GET/POST /polls, POST /polls/:id/vote, DELETE /polls/:id, GET /polls/:id');
  console.log('   🛠️  Utils: GET /health, GET /stats, POST /backup');
  console.log('');
  console.log('💾 Auto-save every 30 seconds + on shutdown');
  console.log('🚀 Ready for MonadSocial with persistent storage and poll support!');
});