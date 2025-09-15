const hre = require("hardhat");

async function main() {
    console.log("🚀 Starting MonadSocial contract deployment...");
    console.log("Network:", hre.network.name);
    
    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    
    // Check balance
    const balance = await deployer.provider.getBalance(deployer.address);
    console.log("Account balance:", hre.ethers.formatEther(balance), "MON");
    
    if (balance < hre.ethers.parseEther("0.01")) {
        console.warn("⚠️  Low balance! You may need more MON tokens from the faucet.");
    }
    
    // Deploy Post contract
    console.log("\n📝 Deploying Post contract...");
    const Post = await hre.ethers.getContractFactory("Post");
    const post = await Post.deploy();
    await post.waitForDeployment();
    const postAddress = await post.getAddress();
    console.log("✅ Post contract deployed to:", postAddress);
    
    // Deploy Poll contract
    console.log("\n🗳️  Deploying Poll contract...");
    const Poll = await hre.ethers.getContractFactory("Poll");
    const poll = await Poll.deploy();
    await poll.waitForDeployment();
    const pollAddress = await poll.getAddress();
    console.log("✅ Poll contract deployed to:", pollAddress);
    
    // Display deployment summary
    console.log("\n🎉 Deployment Complete!");
    console.log("=======================");
    console.log("Post Contract:", postAddress);
    console.log("Poll Contract:", pollAddress);
    console.log("Network:", hre.network.name);
    console.log("Explorer:", `https://explorer.testnet.monad.xyz/address/${postAddress}`);
    
    // Save deployment info to file
    const deploymentInfo = {
        network: hre.network.name,
        postContract: postAddress,
        pollContract: pollAddress,
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        explorerUrls: {
            post: `https://explorer.testnet.monad.xyz/address/${postAddress}`,
            poll: `https://explorer.testnet.monad.xyz/address/${pollAddress}`
        }
    };
    
    const fs = require('fs');
    fs.writeFileSync('deployment.json', JSON.stringify(deploymentInfo, null, 2));
    console.log("📄 Deployment info saved to deployment.json");
    
    // Test contract functionality
    console.log("\n🧪 Testing contract functionality...");
    
    try {
        // Test Post contract
        const createPostTx = await post.createPost("Hello MonadSocial! 🚀", {
            value: hre.ethers.parseEther("0.001")
        });
        await createPostTx.wait();
        console.log("✅ Test post created successfully");
        
        const postCount = await post.getUserPostCount(deployer.address);
        console.log("📊 User post count:", postCount.toString());
        
        // Test Poll contract
        const createPollTx = await poll.createPoll(
            "What's your favorite blockchain?",
            ["Ethereum", "Monad", "Solana", "Bitcoin"],
            30, // 30 minutes
            { value: hre.ethers.parseEther("0.002") }
        );
        await createPollTx.wait();
        console.log("✅ Test poll created successfully");
        
    } catch (error) {
        console.error("❌ Error testing contracts:", error.message);
    }
    
    console.log("\n🏁 Stage 2 Complete! Ready for frontend integration.");
    console.log("\nNext steps:");
    console.log("1. Update .env with contract addresses");
    console.log("2. Verify contracts on explorer");
    console.log("3. Start Stage 3: Frontend UI development");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("💥 Deployment failed:", error);
        process.exit(1);
    });