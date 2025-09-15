// Exact ABI matching your deployed Post.sol contract

export const CONTRACT_ADDRESSES = {
  POST: "0xbd0aa2B4c307B6b635906200886C4Def990337bd",
  POLL: "0xeaF1080862033ED8C1A8CF0afE4cDb1798c9A43b"
};

export const POST_ABI = [
  // Write functions
  {
    "inputs": [{"internalType": "string", "name": "_content", "type": "string"}],
    "name": "createPost",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "_postId", "type": "uint256"}],
    "name": "likePost",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "_postId", "type": "uint256"}],
    "name": "commentOnPost",
    "outputs": [],
    "stateMutability": "payable", 
    "type": "function"
  },
  
  // Read functions - public variables become getter functions
  {
    "inputs": [],
    "name": "totalPosts",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "", "type": "address"}],
    "name": "userPostCount", 
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "name": "posts",
    "outputs": [
      {"internalType": "uint256", "name": "id", "type": "uint256"},
      {"internalType": "address", "name": "owner", "type": "address"},
      {"internalType": "string", "name": "content", "type": "string"},
      {"internalType": "uint256", "name": "timestamp", "type": "uint256"},
      {"internalType": "uint256", "name": "likes", "type": "uint256"},
      {"internalType": "uint256", "name": "comments", "type": "uint256"},
      {"internalType": "bool", "name": "exists", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  
  // Additional helper functions from your contract
  {
    "inputs": [{"internalType": "uint256", "name": "_postId", "type": "uint256"}],
    "name": "getPost",
    "outputs": [
      {
        "components": [
          {"internalType": "uint256", "name": "id", "type": "uint256"},
          {"internalType": "address", "name": "owner", "type": "address"},
          {"internalType": "string", "name": "content", "type": "string"},
          {"internalType": "uint256", "name": "timestamp", "type": "uint256"},
          {"internalType": "uint256", "name": "likes", "type": "uint256"},
          {"internalType": "uint256", "name": "comments", "type": "uint256"},
          {"internalType": "bool", "name": "exists", "type": "bool"}
        ],
        "internalType": "struct Post.PostData",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "_user", "type": "address"}],
    "name": "getUserPostCount",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "_count", "type": "uint256"}],
    "name": "getLatestPosts", 
    "outputs": [
      {
        "components": [
          {"internalType": "uint256", "name": "id", "type": "uint256"},
          {"internalType": "address", "name": "owner", "type": "address"},
          {"internalType": "string", "name": "content", "type": "string"},
          {"internalType": "uint256", "name": "timestamp", "type": "uint256"},
          {"internalType": "uint256", "name": "likes", "type": "uint256"},
          {"internalType": "uint256", "name": "comments", "type": "uint256"},
          {"internalType": "bool", "name": "exists", "type": "bool"}
        ],
        "internalType": "struct Post.PostData[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  
  // Constants
  {
    "inputs": [],
    "name": "POST_FEE",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  
  // Events
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "uint256", "name": "postId", "type": "uint256"},
      {"indexed": true, "internalType": "address", "name": "owner", "type": "address"},
      {"indexed": false, "internalType": "string", "name": "content", "type": "string"},
      {"indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256"}
    ],
    "name": "PostCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "uint256", "name": "postId", "type": "uint256"},
      {"indexed": true, "internalType": "address", "name": "liker", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "totalLikes", "type": "uint256"}
    ],
    "name": "PostLiked",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "uint256", "name": "postId", "type": "uint256"},
      {"indexed": true, "internalType": "address", "name": "commenter", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "totalComments", "type": "uint256"}
    ],
    "name": "PostCommented",
    "type": "event"
  }
];

export const POLL_ABI = [
  // Basic poll functions (for future implementation)
  {
    "inputs": [
      {"internalType": "string", "name": "_question", "type": "string"},
      {"internalType": "string[]", "name": "_options", "type": "string[]"}
    ],
    "name": "createPoll",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];