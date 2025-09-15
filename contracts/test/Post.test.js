const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Post Contract", function () {
    let post;
    let owner, user1, user2;
    const POST_FEE = ethers.parseEther("0.001");
    
    beforeEach(async function () {
        [owner, user1, user2] = await ethers.getSigners();
        
        const Post = await ethers.getContractFactory("Post");
        post = await Post.deploy();
        await post.waitForDeployment();
    });
    
    describe("Post Creation", function () {
        it("Should create a post with correct fee", async function () {
            const content = "Hello MonadSocial!";
            
            await expect(post.connect(user1).createPost(content, { value: POST_FEE }))
                .to.emit(post, "PostCreated")
                .withArgs(1, user1.address, content, await ethers.provider.getBlock('latest').then(b => b.timestamp + 1));
            
            const postData = await post.getPost(1);
            expect(postData.content).to.equal(content);
            expect(postData.owner).to.equal(user1.address);
        });
        
        it("Should reject post without sufficient fee", async function () {
            await expect(
                post.connect(user1).createPost("Test", { value: ethers.parseEther("0.0001") })
            ).to.be.revertedWith("Insufficient fee");
        });
        
        it("Should reject empty content", async function () {
            await expect(
                post.connect(user1).createPost("", { value: POST_FEE })
            ).to.be.revertedWith("Content cannot be empty");
        });
    });
    
    describe("Post Interactions", function () {
        beforeEach(async function () {
            await post.connect(user1).createPost("Test post", { value: POST_FEE });
        });
        
        it("Should allow liking a post", async function () {
            const likeFee = POST_FEE / 10n;
            
            await expect(post.connect(user2).likePost(1, { value: likeFee }))
                .to.emit(post, "PostLiked")
                .withArgs(1, user2.address, 1);
            
            const postData = await post.getPost(1);
            expect(postData.likes).to.equal(1);
        });
        
        it("Should prevent double-liking", async function () {
            const likeFee = POST_FEE / 10n;
            
            await post.connect(user2).likePost(1, { value: likeFee });
            
            await expect(
                post.connect(user2).likePost(1, { value: likeFee })
            ).to.be.revertedWith("Already liked this post");
        });
    });
});