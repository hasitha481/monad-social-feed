// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract Post {
    struct PostData {
        uint256 id;
        address owner;
        string content;
        uint256 timestamp;
        uint256 likes;
        uint256 comments;
        bool exists;
    }
    
    mapping(uint256 => PostData) public posts;
    mapping(address => uint256) public userPostCount;
    mapping(uint256 => mapping(address => bool)) public hasLiked;
    
    uint256 public totalPosts;
    uint256 public constant POST_FEE = 0.001 ether; // Small fee to prevent spam
    
    event PostCreated(
        uint256 indexed postId,
        address indexed owner,
        string content,
        uint256 timestamp
    );
    
    event PostLiked(
        uint256 indexed postId,
        address indexed liker,
        uint256 totalLikes
    );
    
    event PostCommented(
        uint256 indexed postId,
        address indexed commenter,
        uint256 totalComments
    );
    
    modifier postExists(uint256 _postId) {
        require(posts[_postId].exists, "Post does not exist");
        _;
    }
    
    function createPost(string memory _content) external payable {
        require(bytes(_content).length > 0, "Content cannot be empty");
        require(bytes(_content).length <= 280, "Content too long (max 280 chars)");
        require(msg.value >= POST_FEE, "Insufficient fee");
        
        totalPosts++;
        userPostCount[msg.sender]++;
        
        posts[totalPosts] = PostData({
            id: totalPosts,
            owner: msg.sender,
            content: _content,
            timestamp: block.timestamp,
            likes: 0,
            comments: 0,
            exists: true
        });
        
        emit PostCreated(totalPosts, msg.sender, _content, block.timestamp);
    }
    
    function likePost(uint256 _postId) external payable postExists(_postId) {
        require(!hasLiked[_postId][msg.sender], "Already liked this post");
        require(msg.value >= POST_FEE / 10, "Insufficient fee for like"); // 10% of post fee
        
        hasLiked[_postId][msg.sender] = true;
        posts[_postId].likes++;
        
        emit PostLiked(_postId, msg.sender, posts[_postId].likes);
    }
    
    function commentOnPost(uint256 _postId) external payable postExists(_postId) {
        require(msg.value >= POST_FEE / 10, "Insufficient fee for comment");
        
        posts[_postId].comments++;
        
        emit PostCommented(_postId, msg.sender, posts[_postId].comments);
    }
    
    function getPost(uint256 _postId) external view postExists(_postId) returns (PostData memory) {
        return posts[_postId];
    }
    
    function getUserPostCount(address _user) external view returns (uint256) {
        return userPostCount[_user];
    }
    
    function getLatestPosts(uint256 _count) external view returns (PostData[] memory) {
        uint256 count = _count > totalPosts ? totalPosts : _count;
        PostData[] memory latestPosts = new PostData[](count);
        
        for (uint256 i = 0; i < count; i++) {
            latestPosts[i] = posts[totalPosts - i];
        }
        
        return latestPosts;
    }
    
    // Allow contract owner to withdraw fees (for development/maintenance)
    function withdraw() external {
        payable(msg.sender).transfer(address(this).balance);
    }
}