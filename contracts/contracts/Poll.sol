// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract Poll {
    struct PollData {
        uint256 id;
        address creator;
        string question;
        string[] options;
        uint256[] votes;
        uint256 totalVotes;
        uint256 endTime;
        bool active;
        bool exists;
    }
    
    mapping(uint256 => PollData) public polls;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(uint256 => mapping(address => uint256)) public userVote;
    
    uint256 public totalPolls;
    uint256 public constant POLL_FEE = 0.002 ether; // Higher fee for polls
    uint256 public constant VOTE_FEE = 0.0001 ether; // Small fee for voting
    
    event PollCreated(
        uint256 indexed pollId,
        address indexed creator,
        string question,
        string[] options,
        uint256 endTime
    );
    
    event VoteCast(
        uint256 indexed pollId,
        address indexed voter,
        uint256 optionIndex,
        uint256 totalVotes
    );
    
    event PollEnded(
        uint256 indexed pollId,
        uint256 winningOption,
        uint256 winningVotes
    );
    
    modifier pollExists(uint256 _pollId) {
        require(polls[_pollId].exists, "Poll does not exist");
        _;
    }
    
    modifier pollActive(uint256 _pollId) {
        require(polls[_pollId].active, "Poll is not active");
        require(block.timestamp < polls[_pollId].endTime, "Poll has ended");
        _;
    }
    
    function createPoll(
        string memory _question,
        string[] memory _options,
        uint256 _durationMinutes
    ) external payable {
        require(bytes(_question).length > 0, "Question cannot be empty");
        require(_options.length >= 2, "Need at least 2 options");
        require(_options.length <= 10, "Too many options (max 10)");
        require(_durationMinutes > 0, "Duration must be positive");
        require(msg.value >= POLL_FEE, "Insufficient fee");
        
        totalPolls++;
        uint256 endTime = block.timestamp + (_durationMinutes * 60);
        
        polls[totalPolls] = PollData({
            id: totalPolls,
            creator: msg.sender,
            question: _question,
            options: _options,
            votes: new uint256[](_options.length),
            totalVotes: 0,
            endTime: endTime,
            active: true,
            exists: true
        });
        
        emit PollCreated(totalPolls, msg.sender, _question, _options, endTime);
    }
    
    function vote(uint256 _pollId, uint256 _optionIndex) external payable 
        pollExists(_pollId) 
        pollActive(_pollId) 
    {
        require(!hasVoted[_pollId][msg.sender], "Already voted on this poll");
        require(_optionIndex < polls[_pollId].options.length, "Invalid option");
        require(msg.value >= VOTE_FEE, "Insufficient fee for voting");
        
        hasVoted[_pollId][msg.sender] = true;
        userVote[_pollId][msg.sender] = _optionIndex;
        polls[_pollId].votes[_optionIndex]++;
        polls[_pollId].totalVotes++;
        
        emit VoteCast(_pollId, msg.sender, _optionIndex, polls[_pollId].totalVotes);
        
        // Auto-end poll if duration passed
        if (block.timestamp >= polls[_pollId].endTime) {
            endPoll(_pollId);
        }
    }
    
    function endPoll(uint256 _pollId) public pollExists(_pollId) {
        require(
            polls[_pollId].active && 
            (block.timestamp >= polls[_pollId].endTime || msg.sender == polls[_pollId].creator),
            "Cannot end poll"
        );
        
        polls[_pollId].active = false;
        
        // Find winning option
        uint256 winningOption = 0;
        uint256 maxVotes = polls[_pollId].votes[0];
        
        for (uint256 i = 1; i < polls[_pollId].votes.length; i++) {
            if (polls[_pollId].votes[i] > maxVotes) {
                maxVotes = polls[_pollId].votes[i];
                winningOption = i;
            }
        }
        
        emit PollEnded(_pollId, winningOption, maxVotes);
    }
    
    function getPoll(uint256 _pollId) external view pollExists(_pollId) returns (
        uint256 id,
        address creator,
        string memory question,
        string[] memory options,
        uint256[] memory votes,
        uint256 totalVotes,
        uint256 endTime,
        bool active
    ) {
        PollData memory poll = polls[_pollId];
        return (
            poll.id,
            poll.creator,
            poll.question,
            poll.options,
            poll.votes,
            poll.totalVotes,
            poll.endTime,
            poll.active
        );
    }
    
    function getActivePolls() external view returns (uint256[] memory) {
        uint256 activeCount = 0;
        
        // Count active polls
        for (uint256 i = 1; i <= totalPolls; i++) {
            if (polls[i].active && block.timestamp < polls[i].endTime) {
                activeCount++;
            }
        }
        
        // Collect active poll IDs
        uint256[] memory activePolls = new uint256[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 1; i <= totalPolls; i++) {
            if (polls[i].active && block.timestamp < polls[i].endTime) {
                activePolls[index] = i;
                index++;
            }
        }
        
        return activePolls;
    }
    
    function withdraw() external {
        payable(msg.sender).transfer(address(this).balance);
    }
}