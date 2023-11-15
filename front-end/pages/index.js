
import { useState, useEffect } from 'react'
import { ethers } from 'ethers';

function Home() {

    const PERMITTOKENCONTRACT_ADDRESS = '0x679bfE7AdffDC60a1534bA9995263432E0DAb686';   // address of token
    const SPENDERCONTRACT_ADDRESS = "0xBB69CC8341f5245DA877cCF9dab3663770244B67";  // 质押投票的合约地址

    const permitTokenContractAbi = [
        "function name() view returns (string)",
        "function nonces(address owner) view returns (uint256)",
        "function balanceOf(address account) view  returns (uint256)",
        "function permit(address owner, address spender, uint256 value, uint256 deadline,uint8 v,bytes32 r, bytes32 s)",
        "function allowance(address owner, address spender) public view  returns (uint256)",
        "function approve(address spender, uint256 amount) public returns (bool)",
        "function mint(address to, uint256 amount) public",  // mint代币， 这个不要放在前端， 可以放到管理员的页面

    ];
    const spenderContractAbi = [
        "function balances(address) view returns (uint256)",
        "function setVotingDuration(uint256 _proposalId, uint256 _durationInSeconds)",
        "function reclaimVotingRights(uint256 _proposalId)",
        "function pause()",
        "function unpause()",
        "function votingEndTimes(uint256) view returns (uint256)",
        "function proposalId() view returns (uint256)",
        "function optionId(uint256) view returns (uint256)",
        "function options(uint256, uint256) view returns (uint256 id, string name, uint256 voteCount)",
        "function deposit(uint256 amount) public", // 存款函数，允许用户存入指定数量的代币
        "function withdraw(uint256 amount) public", // 提款函数，允许用户提取指定数量的代币
        "function vote(uint256 _proposalId, uint256 _optionId, uint256 _amount) public", // 投票函数，允许用户对特定提案的选项投票
        "function getContractBalance() public view returns (uint)", // 查询合约余额函数，返回合约中的代币总量
        "function createProposalWithOptions(string memory proposalDescription, string[] memory optionDescriptions) public", // 创建提案函数，允许用户创建一个新提案并添加选项
        "function processUserStakedProposal(address userAddress, string memory proposalDescription, uint256 stakeAmount, string[] memory optionDescriptions, uint256 stakeIndex) public", // 处理用户质押提案函数，允许管理员处理用户的质押提案
        "function settleFundsForAverageQuality(uint256 _proposalId) public", // 结算平均质量提案的资金，用于处理提案质量一般的情况
        "function verifyComplianceAndExpectations(uint256 _proposalId) public", // 验证合规性和预期函数，用于检查提案是否符合预期和规定
        "function checkQualityComplianceBelowExpectations(uint256 _proposalId) public", // 检查低于预期的质量合规性，用于处理提案质量低于预期的情况
        "function setUnlockTimeForStake(address _staker,uint256 _stakeIndex, uint256 _newUnlockTime) public", // 设置质押解锁时间函数，允许管理员为特定质押设置新的解锁时间
        "function voters(address, uint256) public view returns (bool)", // 查询投票者函数，检查指定地址是否已对某提案投票
        "function usedVotingRights(address) public view returns (uint256)", // 查询已用投票权函数，返回指定地址已使用的投票权数量
        "function getUserVotingHistory(address) public view returns (uint256[],uint256[],uint256[])", // 获取用户投票历史函数，返回指定地址的投票记录
        "function stakeTokensForProposal(uint256 _amount) public returns (uint256)" ,
        "function proposalOptions(uint256) public view returns (Option[])",
        "function proposalsLength() public view returns (uint256)",
        "function getOptionsCount(uint256 proposalId) public view returns (uint256)",
        "function getOptionVoteCount(uint256 proposalId, uint256 optionIndex) public view returns (uint256)",
        "function getProposalStatus(uint256 _proposalId) public view returns(bool)",
        "function SetProposalStatus(uint256 _proposalId, bool _isActive) public",
        "function getAvailableWithdrawBalance(address user) public view returns (uint256)",

        "event DepositForProposal(address indexed staker, uint256 amount, bool staked, uint256 unlockTime, uint256 indexed stakeIndex)",
        "event ProposalAndOptionsSubmitted(address indexed user, uint256 indexed proposalIndex, string proposalDescription, string[] optionDescriptions)",
        "event ProposalForUser(address indexed userAddress, uint256 indexed proposalId, string proposalDescription, uint256 stakeAmount, string[] optionDescriptions)",
        "event TokensStaked(address indexed user, uint256 amount, bool isForProposal)",
        "event FundsSettledForAverageQuality(uint256 indexed proposalId, address indexed proposer, uint256 amountToReturn)",
        "event WithdrawalDetailed(address indexed user, uint256 amountWithdrawn, uint256 balanceAfterWithdrawal, uint256 lockedAmount)",
        "event UnlockTimeUpdated(address indexed staker, uint256 indexed stakeIndex, uint256 newUnlockTime)",
        "event FundsPenalizedForNonCompliance(uint256 indexed proposalId, address indexed proposer, uint256 penalty)",
        "event Voted(address indexed _address, uint256 indexed _proposalId, uint256 indexed _optionId, uint256 _amount)"
    ];

    const [provider, setProvider] = useState(); // provider是变量， setProvider 是函数
    const [account, setAccount] = useState();
    const [signer, setSigner] = useState();
    const [account_value, set_account_value] = useState();  // 当前账户在合约的余额
    const [min_amount, set_minAmount] = useState("0.00001");   
    const [balance, setBalance] = useState();
    const [allowance, setAllowance] = useState();
    const [depositAmount, setDepositAmount] = useState("0"); // 初始化为字符串 "0"
    const [withdrawAmount, setWithdrawAmount] = useState("0"); // 初始化为字符串 "0"
    const [contractBalance, setContractBalance] = useState("0");
    const [MintAmount, setMintAmount] = useState("0");
    const [proposalId, setProposalId] = useState();     // 设置提案的id
    const [proposalDescription, setProposalDescription] = useState('');
    const [proposal_Description, setProposal_Description] = useState('');
    const [UserAddress_forpro, set_serAddress_forpro] = useState('');

    
    const [optionText, setOptionText] = useState("");
    const [stakeAmount, setStakeAmount] = useState('');
    const [stake_Amount, set_StakeAmount] = useState('');

    const [optionDescriptions, setoptionDescriptions] = useState('');
    const [stakeIndex, setstakeIndex] = useState('');


    const [voteProposalID, setVoteProposalID] = useState(""); // 投票栏的提案
    const [voteOptionID, setVoteOptionID] = useState("");   // 投票栏的选项option
    const [voteAmount, setVoteAmount] = useState("");       // 投了多少票

    const [queryProposalID, setQueryProposalID] = useState('');  // 查询， 直接输入uint
    const [reclaimvote, setreclaimvotet] = useState("");
    const [reclaimvote_id, setreclaimvote_id] = useState("");
    const [queryAccountAddress, setQueryAccountAddress] = useState("");
    const [proposalIdForStatus, setProposalIdForStatus] = useState('0');
    const [proposalStatusActive, setProposalStatusActive] = useState(false);
    
    const [stakeIndexForUnlock, setStakeIndexForUnlock] = useState('');
    const [stakerAddressForUnlock, setStakerAddressForUnlock] = useState('');
    const [newUnlockTimeForStake, setNewUnlockTimeForStake] = useState('');
    const [availableWithdrawBalance, setAvailableWithdrawBalance] = useState("0");

    // 点击按钮的时候登录
    const connectOnclick = async () => {
        if (!window.ethereum) return;
    
        const providerWeb3 = new ethers.providers.Web3Provider(window.ethereum);
        setProvider(providerWeb3);
    
        const currenAccount = await providerWeb3.send("eth_requestAccounts", []);
        setAccount(currenAccount[0]);
        setSigner(providerWeb3.getSigner(currenAccount[0]));
    
        ethereum.on("accountsChanged", accountsChange => {
          setAccount(accountsChange[0]);
          setSigner(providerWeb3.getSigner(accountsChange[0]));
        });
      };
    
 
      useEffect(() => {
        if (!window.ethereum || !provider || !account) return;
    
        provider.getBalance(account).then(result => {
          setBalance(ethers.utils.formatEther(result));
        });
      }, [account, provider]);

    useEffect(() => {
        if (!signer) {
            return;
        }
        const contract = new ethers.Contract(SPENDERCONTRACT_ADDRESS, spenderContractAbi, signer);
        // Fetch and set the contract balance
        async function fetchContractBalance() {
            const balance = await contract.balances(account);
            set_account_value(ethers.utils.formatEther(balance));
        }
        fetchContractBalance();
    }, [account_value, signer]);
    
    useEffect(() => {
        if (!signer) return;
    
        const contract = new ethers.Contract(SPENDERCONTRACT_ADDRESS, spenderContractAbi, signer);
    
        async function fetchContractBalance() {
          const balance = await contract.getContractBalance();
          setContractBalance(ethers.utils.formatEther(balance));
        }
    
        fetchContractBalance();
      }, [contractBalance, signer]);

    // 授权， 质押代币的时候必须先授权， 才可以发送或者质押
    const approveAndSubmit = async () => {
        try {
            if (!signer) {
                alert("请连接钱包");
                return;
            }
            const permitTokenContract = new ethers.Contract(
                PERMITTOKENCONTRACT_ADDRESS,
                permitTokenContractAbi,
                signer
            );
            const balance = await permitTokenContract.balanceOf(account);
            const _amount = ethers.utils.parseEther(min_amount);
            if (balance.lt(_amount)) {
                alert("余额不足，无法授权这么多代币。");
                return;
            }
            const approvalTransaction = await permitTokenContract.approve(
                SPENDERCONTRACT_ADDRESS,
                _amount
            );
            await approvalTransaction.wait();
            const allowance = await permitTokenContract.allowance(account, SPENDERCONTRACT_ADDRESS);
            if (allowance.lt(_amount)) {
                alert("授权失败");
                return;
            }
            setAllowance(ethers.utils.formatEther(allowance));
            alert("授权成功");        
        } catch (error) {
            console.error("发生错误:", error);
            alert("发生错误。请查看控制台以获取详细信息。");
        }
    };

    const handleDeposit = async (depositAmount) => {
        console.log("handleDeposit 被调用，存款金额为: ", depositAmount);
        if (!signer) return;
        try {
            const permitTokenContract = new ethers.Contract(
                PERMITTOKENCONTRACT_ADDRESS,
                permitTokenContractAbi,
                signer
            );
            const allowance_valued = await permitTokenContract.allowance(account, SPENDERCONTRACT_ADDRESS);
            if (allowance_valued.lt(depositAmount)) {
                alert("allowance_valued 不足");
                return;
            }
            const contract = new ethers.Contract(
                SPENDERCONTRACT_ADDRESS,
                spenderContractAbi,
                signer
            );
            const tx = await contract.deposit(ethers.utils.parseEther(depositAmount));
            await tx.wait();
            alert("存款成功！");
            const current_account_value = await contract.balances(account);
            set_account_value(ethers.utils.formatEther(current_account_value));
            const newBalance = await contract.getContractBalance();
            setContractBalance(ethers.utils.formatEther(newBalance));
        } catch (error) {
            console.error("发生错误:", error);
        }
    };


    const handleStakeTokensForProposal = async (stakeAmount) => {
        console.log("handleStakeTokensForProposal 被调用，质押金额为: ", stakeAmount);
        if (!signer) return;
    
        try {
            const permitTokenContract = new ethers.Contract(
                PERMITTOKENCONTRACT_ADDRESS,
                permitTokenContractAbi,
                signer
            );
            const allowance_valued = await permitTokenContract.allowance(account, SPENDERCONTRACT_ADDRESS);
            if (allowance_valued.lt(depositAmount)) {
                alert("allowance_valued 不足");
                return;
            }
            const spenderContract = new ethers.Contract(
                SPENDERCONTRACT_ADDRESS,
                spenderContractAbi,
                signer
            );
            spenderContract.on("DepositForProposal", (staker, amount, staked, unlockTime, stakeIndex) => {
                console.log("DepositForProposal 事件被触发：");
                console.log("staker:", staker);
                console.log("amount:", ethers.utils.formatEther(amount));
                console.log("staked_bool:", staked);
                console.log("unlockTime:", new Date(unlockTime * 1000).toLocaleString()); // 将时间戳转换为可读格式
                console.log("stakeIndex:", stakeIndex.toString());
            });

            // 发起质押
            const tx = await spenderContract.stakeTokensForProposal(ethers.utils.parseEther(stakeAmount));

            const receipt = await tx.wait(); // 等待交易被挖矿确认
            console.log('质押交易完成，交易凭据:', receipt);
            alert('质押成功');
            const current_account_value = await spenderContract.balances(account);
            set_account_value(ethers.utils.formatEther(current_account_value));
            const newBalance = await spenderContract.getContractBalance();
            setContractBalance(ethers.utils.formatEther(newBalance));
        } catch (error) {
            console.error("质押失败:", error);
            alert('质押失败');
        }
    };
    
    

    const handleWithdraw = async (withdrawAmount) => {
        if (!signer) return;
        console.log("handleWithdraw 被调用，撤销金额为: ", withdrawAmount);

        try {
            const contract = new ethers.Contract(
                SPENDERCONTRACT_ADDRESS,
                spenderContractAbi,
                signer
            );
            if (!withdrawAmount || ethers.utils.parseEther(withdrawAmount).lte(0)) {
                alert('提款金额应大于 0');
                console.log("无效的值。");
                return;
            }

            const accountValueInWei = ethers.utils.parseEther(account_value);
            if (ethers.utils.parseEther(withdrawAmount).gt(accountValueInWei)) {
                alert('提款金额超过账户余额');
                return;
            }

            let used_vote = await contract.usedVotingRights(account);
            if (ethers.utils.parseEther(withdrawAmount).gt(accountValueInWei.sub(used_vote))) {
                alert('在投票中， 投票的余额不能撤销！');
                return;
            }

            const tx = await contract.withdraw(ethers.utils.parseEther(withdrawAmount));
            await tx.wait();
            alert("取款成功！");
            const current_account_value = await contract.balances(account);
            set_account_value(ethers.utils.formatEther(current_account_value));
            const newBalance = await contract.getContractBalance();
            setContractBalance(ethers.utils.formatEther(newBalance));
        } catch (error) {
            console.error("发生错误:", error);
        }
    };

    const fetchAvailableWithdrawBalance = async () => {
        if (!signer) return;
        const contract = new ethers.Contract(SPENDERCONTRACT_ADDRESS, spenderContractAbi, signer);
        try {
            console.log(account)
            const current_balance = await contract.getAvailableWithdrawBalance(account);
            console.log(ethers.utils.formatEther(current_balance))

            setAvailableWithdrawBalance(ethers.utils.formatEther(current_balance));
        } catch (error) {
            console.error("获取可提款余额失败：", error);
        }
    };
    
    const Mint = async (MintAmount) => {
        if (!signer) return;
        console.log("Mint 的数量为: ", MintAmount);
        const contract = new ethers.Contract(PERMITTOKENCONTRACT_ADDRESS, permitTokenContractAbi, signer);

        // 判断是否有效（大于 0）
        let value = ethers.BigNumber.from(MintAmount);
        if (value.lte(0)) {
            alert('mint value should be more than 0');
            console.log("Invalid Mint.");
            return;
        }

        const pre_balance = await contract.balanceOf(account);
        console.log('mint 前的余额为：', ethers.utils.formatEther(pre_balance));

        const tx = await contract.mint(account, value);
        await tx.wait();
        alert("Mint成功！");
    
        const balance = await contract.balanceOf(account);
        console.log('mint 后的余额为：', ethers.utils.formatEther(balance));
    };
  
    const Add_ProposalWithOptions = async (proposalDescription, optionText) => {
        if (!signer) return;
        console.log("Creating proposal with options: ", proposalDescription, optionText);
        const contract = new ethers.Contract(SPENDERCONTRACT_ADDRESS, spenderContractAbi, signer);
        // 监听事件
        contract.on("ProposalAndOptionsSubmitted", (user, proposalId, description, options) => {
            console.log("New proposal and options submitted:");
            console.log("User:", user);
            console.log("Proposal ID:", proposalId.toString());
            console.log("Description:", description);
            console.log("Options:", options);
            // 可以在此添加更多的UI更新逻辑
        });

        // 使用 split 方法按逗号分隔字符串，并去除两端可能的空格
        let optionsArray = optionText.split(',').map(option => option.trim());

        try {
            // 调用智能合约的createProposalWithOptions函数
            const tx = await contract.createProposalWithOptions(proposalDescription, optionsArray);
            console.log('Waiting for the transaction to be mined...');
            await tx.wait();
            console.log('Transaction confirmed.');
            alert('Proposal added successfully');

        } catch (error) {
            console.error("Error submitting proposal and options:", error);
            alert('Error when adding proposal and options.');
        }
    };
    

    const processStakedProposal = async (UserAddress, proposalDescription, stakeAmount, optionDescriptions, stakeIndex) => {
        if (!signer) return;
        console.log("Processing user staked proposal: ", proposalDescription, optionDescriptions);
        const contract = new ethers.Contract(SPENDERCONTRACT_ADDRESS, spenderContractAbi, signer);
    
        // 监听事件
        contract.on("ProposalForUser", (user, proposalId, description,optionDescriptions, stake) => {
            console.log("User staked proposal processed:");
            console.log("User:", user);
            console.log("Proposal ID:", proposalId.toString());
            console.log("Description:", description);
            console.log("optionDescriptions:", optionDescriptions);

            console.log("Stake Amount:", stake);
            // 此处可以添加更多逻辑，例如更新前端UI
        });
    
        try {
            // 发起处理质押提案的请求
            const tx = await contract.processUserStakedProposal(
                UserAddress,
                proposalDescription,
                ethers.utils.parseUnits(stakeAmount.toString(), 'ether'), // 假设stakeAmount是以ether单位
                optionDescriptions,
                stakeIndex
            );
            await tx.wait();  // 等待交易被挖矿确认
            alert('提案及选项处理成功');
        } catch (error) {
            console.error("提案及选项处理失败：", error);
            alert('提案及选项处理失败');
        }
    };


    const vote = async (voteProposalID, voteOptionID, voteAmount) => {
        if (!signer) return;
    
        // Parse the proposalID and optionID to integers
        const proposalIDInt = parseInt(voteProposalID, 10);
        const optionIDInt = parseInt(voteOptionID, 10);
        const voteAmountInt = ethers.utils.parseEther(voteAmount);  // 显示的是整数， 实际传入的是bignumber
        console.log(`正在投票的提案ID是${proposalIDInt}， 选项ID为${optionIDInt}， 投票数量为${voteAmount}`);
    
        const contract = new ethers.Contract(SPENDERCONTRACT_ADDRESS, spenderContractAbi, signer);
        const used_vote = await contract.usedVotingRights(account);
        const balance = await contract.balances(account);  // fetch once to avoid multiple calls
    
        if (balance.sub(used_vote).lte(voteAmountInt)){
            console.log('you dont have enough values to vote');
            alert('you dont have enough values to vote');
            return;
        }

        contract.on("Voted", (user, proposalId, _optionId, _amount) => {
            console.log("User voted proposal processed:");
            console.log("User:", user);
            console.log("Proposal ID:", proposalId.toString());
            console.log("optionId:", _optionId);
            console.log("vote Amount:", ethers.utils.formatEther(_amount));
        });

        try {
            console.log(`当前账户还有${ethers.utils.formatEther(balance) - ethers.utils.formatEther(used_vote)}投票权利， 投票数量为${voteAmount}`);
            const tx = await contract.vote(proposalIDInt, optionIDInt, voteAmountInt);
            await tx.wait();  // Wait for transaction to be mined
            
            alert('投票成功');
        } catch (error) {
            console.error("投票失败：", error);
            alert('投票失败');
        }
        // Optionally, list all options for the given proposal with updated vote counts
        // try {
        //     // 获取特定提案的所有选项
        //     const optionsArray = await contract.proposalOptions(proposalIDInt);
        //     console.log(optionsArray, '---------');
        //     return
        //     // 遍历选项
        //     for (let i = 0; i < optionsArray.length; i++) {
        //         const option = optionsArray[i];
        //         console.log(`选项ID: ${i}, 选项描述: ${option.description}, 投票数: ${option.voteCount.toString()}`);
        //     }
        // } catch (error) {
        //     console.error("获取选项失败：", error);
        //     alert('获取选项失败');
        // }
    };

    const fetchProposalOptions = async (queryProposalID) => {
        if (!signer) return;
        console.log("正在查询提案ID: ", queryProposalID);
        const contract = new ethers.Contract(SPENDERCONTRACT_ADDRESS, spenderContractAbi, signer);
        try {
            // 获取特定提案的选项数量
            const optionsCount = await contract.getOptionsCount(queryProposalID);
    
            // 遍历选项并获取每个选项的投票计数
            for (let i = 0; i < optionsCount; i++) {
                const voteCount = await contract.getOptionVoteCount(queryProposalID, i);
                console.log(`选项 ${i}: 投票数: ${ethers.utils.formatEther(voteCount)}`);
            }
        } catch (error) {
            console.error("获取选项失败：", error);
        }
    };
    
    // const setVotingDurationForProposal = async (proposalId, duration) => {
    //     if (!signer) return;
    //     console.log("为提案设置投票持续时间， 提案ID：", proposalId, "持续时间：", duration, "秒");
    //     const contract = new ethers.Contract(SPENDERCONTRACT_ADDRESS, spenderContractAbi, signer);
        
    //     try {
    //         const tx = await contract.setVotingDuration(proposalId, duration);
    //         await tx.wait();  
    //         alert('成功设置投票持续时间');
    //     } catch (error) {
    //         console.error("设置投票持续时间失败：", error);
    //         alert('设置投票持续时间失败');
    //     }
    
    //     const endTime = await contract.votingEndTimes(proposalId); // 假设您的合约中有一个叫做votingEndTimes的mapping
    //     console.log(`提案 ${proposalId} 的投票将在时间戳 ${endTime} 结束`);
    // };

    const reclaimVoting = async (reclaimvote, reclaimvote_id) => {
        if (!signer) return;
        try {
            // 创建合约实例
            const contract = new ethers.Contract(SPENDERCONTRACT_ADDRESS, spenderContractAbi, signer);
            // 调用reclaimVotingRights函数
            const tx = await contract.reclaimVotingRights(reclaimvote, reclaimvote_id);

            // 等待交易被确认
            await tx.wait();
            console.log("Successfully reclaimed voting rights for proposal ID:", proposalId);
            alert('重置成功')
        } catch (error) {
            alert('重置失败， 你不是管理员')
            console.error("Error reclaiming voting rights:", error);
        }
    };

    const printUserVotingHistory = async (queryAccountAddress) => {
        if (!signer) {
            console.error("No signer found");
            return;
        }
        try {
            // 创建合约实例
            const contract = new ethers.Contract(SPENDERCONTRACT_ADDRESS, spenderContractAbi, signer);
            // 调用合约方法获取用户的投票记录
            const [proposalIds, optionIds, amounts] = await contract.getUserVotingHistory(queryAccountAddress);
            // 检查三个数组的长度是否一致
            if (!(proposalIds.length === optionIds.length && optionIds.length === amounts.length)) {
                throw new Error('The returned arrays do not match in length');
            }
            // 遍历每个投票记录
            for (let i = 0; i < proposalIds.length; i++) {
                // 输出每条投票记录的详细信息
                console.log(`Proposal ID: ${proposalIds[i]}, Option ID: ${optionIds[i]}, Amount: ${ethers.utils.formatEther(amounts[i])} 票数`);
            }
        } catch (error) {
            console.error("Error fetching voting history:", error);
            // 根据错误类型给用户合适的反馈
            alert("无法获取投票历史，请确保您连接了正确的网络并且合约地址及ABI是正确的。");
        }
    };
    
    const settleFundsForAverageQuality = async (proposalId) => {
        if (!signer) return;
        const contract = new ethers.Contract(SPENDERCONTRACT_ADDRESS, spenderContractAbi, signer);
        
        // Listen for the FundsSettledForAverageQuality event
        contract.on("FundsSettledForAverageQuality", (id, proposer, profit, event) => {
          console.log(`Funds settled for proposal ID ${id}:`);
          console.log(`Proposer: ${proposer}`);
          console.log(`Profit: ${ethers.utils.formatEther(profit)}`);
          // Additional logic to update UI or state can be added here
        });
      
        try {
          // Call the settleFundsForAverageQuality function
          const tx = await contract.settleFundsForAverageQuality(proposalId);
          await tx.wait(); // Wait for the transaction to be mined
          alert('Funds settled successfully.');
        } catch (error) {
          console.error("Error settling funds:", error);
          alert('Error settling funds.');
        }
      };
      
    const verifyComplianceAndExpectations = async (proposalId) => {
        if (!signer) return;
        const contract = new ethers.Contract(SPENDERCONTRACT_ADDRESS, spenderContractAbi, signer);
      
        // Listen for the FundsSettledForAverageQuality event
        contract.on("FundsSettledForAverageQuality", (id, proposer, profit, event) => {
            console.log(`Compliance verified for proposal ID ${id}:`);
            console.log(`Proposer: ${proposer}`);
            console.log(`Profit: ${ethers.utils.formatEther(profit)}`);
          // Additional logic to update UI or state can be added here
        });
      
        try {
          // Call the verifyComplianceAndExpectations function
          const tx = await contract.verifyComplianceAndExpectations(proposalId);
          await tx.wait(); // Wait for the transaction to be mined
          alert('Compliance verified and funds settled successfully.');
        } catch (error) {
          console.error("Error verifying compliance:", error);
          alert('Error verifying compliance.');
        }
      };
      
    const checkQualityComplianceBelowExpectations = async (proposalId) => {
        if (!signer) return;
        const contract = new ethers.Contract(SPENDERCONTRACT_ADDRESS, spenderContractAbi, signer);
      
        // Listen for the FundsPenalizedForNonCompliance event
        contract.on("FundsPenalizedForNonCompliance", (id, proposer, penalty, event) => {
            console.log(`Penalty for non-compliance applied to proposal ID ${id}:`);
            console.log(`Proposer: ${proposer}`);
            console.log(`Penalty: ${ethers.utils.formatEther(penalty)}`);
            // Additional logic to update UI or state can be added here
        });
      
        try {
          // Call the checkQualityComplianceBelowExpectations function
          const tx = await contract.checkQualityComplianceBelowExpectations(proposalId);
          await tx.wait(); // Wait for the transaction to be mined
          alert('Quality compliance checked and penalty applied successfully.');
        } catch (error) {
          console.error("Error checking quality compliance:", error);
          alert('Error checking quality compliance.');
        }
      };
      
    const setUnlockTimeForStake = async (stakerAddressForUnlock, stakeIndexForUnlock, newUnlockTimeForStake) => {
        if (!signer) return;
        const contract = new ethers.Contract(SPENDERCONTRACT_ADDRESS, spenderContractAbi, signer);
   
        try {
            const transaction = await contract.setUnlockTimeForStake(stakerAddressForUnlock, stakeIndexForUnlock, newUnlockTimeForStake);
            await transaction.wait();
            console.log(`质押解锁时间更新成功，质押者: ${stakerAddressForUnlock}, 质押索引: ${stakeIndexForUnlock}, 新解锁时间: ${newUnlockTimeForStake}`);
        } catch (error) {
            console.error("质押解锁时间更新失败：", error);
        }
    };

    const setProposalStatus = async (proposalIdForStatus) => {
        if (!signer) return;
        const contract = new ethers.Contract(SPENDERCONTRACT_ADDRESS, spenderContractAbi, signer);
  
        try {
            // 获取并记录提案改变之前的状态
            const oldStatus = await contract.getProposalStatus(proposalIdForStatus);

            console.log(`提案ID: ${proposalIdForStatus.toString()} 的原始状态: ${oldStatus.toString()}`);
            // 更新提案状态
            const transaction = await contract.SetProposalStatus(proposalIdForStatus, proposalStatusActive);
            await transaction.wait();

            // 获取并记录提案改变之后的状态
            const newStatus = await contract.getProposalStatus(proposalIdForStatus);
            console.log(`提案状态更新成功，提案ID: ${proposalIdForStatus}, 旧状态: ${oldStatus}, 新状态: ${newStatus}`);
        } catch (error) {
            console.error("提案状态更新失败：", error);
        }
    };

    
    return (
        <>
            <div className="topnav">
                <a className="nav-link" href="#">Home</a>
                <a className="nav-link" href="#">Article</a>
                <a className="nav-link" href="#">Tag</a>
                <a className="nav-link" href="#">About</a>
                {account ? (
                    <a className="nav-link right" href="#">Connected</a>
                ) : (
                    <a className="nav-link right" href="#" onClick={connectOnclick}>Connect Wallet</a>
                )}
            </div>
            <div className="container">
                <div className="row">
                    <h3 className="site-title">初版</h3>
    
                    <div className="account-info">
                        <h5>账号:{account}</h5>
                        <h5>金额:{balance}</h5>
                        <h5>授权金额:<span className="highlight">{allowance}</span></h5>
                        <h5>合约余额:{contractBalance}</h5>
                    </div>
    
                    <div className="contract-info">
                        <h5>该合约下当前账户余额:{account_value}</h5>
                    </div>
    
                    <button className="button" onClick={approveAndSubmit}>授权</button>
                </div>
    
                <div className="transaction">
                    <h5>Claim</h5>
                    <input 
                        className="input"
                        type="text"
                        value={MintAmount}
                        onChange={e => setMintAmount(e.target.value)}
                        placeholder="Amount to Mint"
                    />
                    <button className="button" onClick={() => Mint(MintAmount)}>Claim***</button>
                </div>
    
                <div className="transaction">
                    <h5>Deposit</h5>
                    <input 
                        className="input"
                        type="text"
                        value={depositAmount}
                        onChange={e => setDepositAmount(e.target.value)}
                        placeholder="Amount to deposit"
                    />
                    <button className="button" onClick={() => handleDeposit(depositAmount)}>Deposit</button>
                </div>

            <div className="stake-tokens-section">
                <h5>质押代币用于提案</h5>
                <input
                    className="input"
                    type="text"
                    value={stakeAmount}
                    onChange={e => setStakeAmount(e.target.value)}
                    placeholder="输入质押对赌金额"
                />
                <button className="button" onClick={() => handleStakeTokensForProposal(stakeAmount)}>质押代币</button>
            </div>

                <div className="transaction">
                    <h5>Withdraw</h5>
                    <input 
                        className="input"
                        type="text"
                        value={withdrawAmount}
                        onChange={e => setWithdrawAmount(e.target.value)}
                        placeholder="Amount to withdraw"
                    />
                    <button className="button" onClick={() => handleWithdraw(withdrawAmount)}>Withdraw</button>
                </div>

                <div className="transaction">
                    <h5>可提款余额</h5>
                    <input 
                        className="input"
                        type="text"
                        value={availableWithdrawBalance}
                        onChange={e => setAvailableWithdrawBalance(e.target.value)}
                        placeholder="Amount to withdraw"
                    />
                    <button className="button" onClick={() => fetchAvailableWithdrawBalance(availableWithdrawBalance)}>查询可提款余额</button>
                </div>
            </div>


            <div className="container">
                <h3 className="site-title">提案系统</h3>

                <div className="options-section">
                    <h5>创建提案及其选项</h5>
                    <input
                        className="input"
                        type="text"
                        value={proposalDescription}
                        onChange={e => setProposalDescription(e.target.value)}
                        placeholder="输入提案描述"
                    />
                    <input
                        className="input"
                        type="text"
                        value={optionText}
                        onChange={e => setOptionText(e.target.value)}
                        placeholder="输入选项内容，用逗号分隔"
                    />

                <button className="button" onClick={() => Add_ProposalWithOptions(proposalDescription, optionText)}>创建提案及选项***</button>
                </div>

            <div className="staked-proposal-section">
                <h5>处理质押的提案</h5>
                <input
                    className="input"
                    type="text"
                    placeholder="输入用户地址"
                    onChange={e => set_serAddress_forpro(e.target.value)}
                />
                <input
                    className="input"
                    type="text"
                    placeholder="输入提案描述"
                    onChange={e => setProposal_Description(e.target.value)}
                />
                <input
                    className="input"
                    type="text"
                    placeholder="输入质押金额"
                    onChange={e => set_StakeAmount(e.target.value)}
                />
                <input
                    className="input"
                    type="text"
                    placeholder="输入选项内容，用逗号分隔"
                    onChange={e => setoptionDescriptions(e.target.value.split(','))}
                />
                <input
                    className="input"
                    type="text"
                    placeholder="输入质押索引"
                    onChange={e => setstakeIndex(e.target.value)}
                />
                <button className="button" onClick={() => processStakedProposal(UserAddress_forpro, proposal_Description, stake_Amount, optionDescriptions, stakeIndex)}>处理提案***</button>
            </div>

                
                <div className="voting-section">
                    <h5>投票</h5>
                    <input
                        className="input"
                        type="text"
                        value={voteProposalID}
                        onChange={(e) => setVoteProposalID(e.target.value)}
                        placeholder="投案ID"
                    />
                    <input
                        className="input"
                        type="text"
                        value={voteOptionID}
                        onChange={(e) => setVoteOptionID(e.target.value)}
                        placeholder="选项ID"
                    />
                    <input
                        className="input"
                        type="text"
                        value={voteAmount}
                        onChange={(e) => setVoteAmount(e.target.value)}
                        placeholder="投票数额"
                    />
                    <button className="button" onClick={() => {vote(voteProposalID,voteOptionID, voteAmount)}}>投票</button>
                </div>

                <div className="proposal-info-section">
                    <h5>查询提案及其选项</h5>
                    <input
                        className="input"
                        type="text"
                        value={queryProposalID}
                        onChange={e => setQueryProposalID(e.target.value)}
                        placeholder="输入提案ID"
                    />
                    <button className="button" onClick={() => {fetchProposalOptions(queryProposalID)}}>查询提案</button>

                    <div id="output" className="output">
                    </div>
                </div>

                <div className="proposal-info-section">
                    <h5>重置投票</h5>
                    <input
                        className="input"
                        type="text"
                        value={reclaimvote}
                        onChange={e => setreclaimvotet(e.target.value)}
                        placeholder="输入提案ID"
                    />
                    <input
                        className="input"
                        type="text"
                        value={reclaimvote_id}
                        onChange={e => setreclaimvote_id(e.target.value)}
                        placeholder="输入选项ID"
                    />
                    <button className="button" onClick={() => {reclaimVoting(reclaimvote, reclaimvote_id)}}>重置投票</button>

                    <div id="output" className="output">
                    </div>
                </div>

                <div className="proposal-info-section">
                <h5>查询账户的投票记录</h5>
                    <input
                        className="input"
                        type="text"
                        value={queryAccountAddress}
                        onChange={e => setQueryAccountAddress(e.target.value)}
                        placeholder="输入账户地址"
                    />
                    <button className="button" onClick={() => {printUserVotingHistory(queryAccountAddress)}}>查询投票记录</button>
                </div>

                <div className="proposal-info-section">
                    <h5>修改提案状态</h5>
                    <input
                        className="input"
                        type="text"
                        value={proposalIdForStatus}
                        onChange={(e) => setProposalIdForStatus(e.target.value)}
                        placeholder="输入提案ID"
                    />
                    <button className="button" onClick={() => {setProposalStatus(proposalIdForStatus)}}>修改提案状态***</button>
                </div>

                <div className="proposal-info-section">
                    <h5>设置质押解锁时间</h5>
                    <input
                        className="input"
                        type="text"
                        value={stakerAddressForUnlock}
                        onChange={(e) => setStakerAddressForUnlock(e.target.value)}
                        placeholder="输入质押者地址"
                    />
                    <input
                        className="input"
                        type="text"
                        value={stakeIndexForUnlock}
                        onChange={(e) => setStakeIndexForUnlock(e.target.value)}
                        placeholder="输入质押索引"
                    />
                    <input
                        className="input"
                        type="text"
                        value={newUnlockTimeForStake}
                        onChange={(e) => setNewUnlockTimeForStake(e.target.value)}
                        placeholder="输入新的解锁时间"
                    />
                    <button className="button" onClick={() => {setUnlockTimeForStake(stakerAddressForUnlock, stakeIndexForUnlock, newUnlockTimeForStake)}}>更新质押解锁时间***</button>
                </div>


                <div className="proposal-actions-section">
                    <h5>处理提案资金</h5>
                    <input
                        className="input"
                        type="text"
                        value={proposalId}
                        onChange={e => setProposalId(e.target.value)}
                        placeholder="输入提案ID"
                    />
                    <button className="button" onClick={() => {settleFundsForAverageQuality(proposalId)}}>验证合规性***</button>
                    <button className="button" onClick={() => {verifyComplianceAndExpectations(proposalId)}}>检查质量合规性***</button>
                    <button className="button" onClick={() => {checkQualityComplianceBelowExpectations(proposalId)}}>结算资金***</button>
                </div>

                </div>

    
            <style jsx>
                {`
                * {
                    box-sizing: border-box;
                    margin: 0;
                    padding: 0;
                }
                body {
                    font-family: Arial, sans-serif;
                    background-color: #f4f4f4;
                }
                .topnav {
                    background-color: #333;
                    color: white;
                    padding: 15px 0;
                    text-align: center;
                }
                .nav-link {
                    padding: 10px 15px;
                    color: white;
                    text-decoration: none;
                }
                .right {
                    float: right;
                }
                .container {
                    padding: 20px;
                    background-color: white;
                    margin: 20px;
                    border-radius: 8px;
                    box-shadow: 0px 0px 5px #aaa;
                }
                .site-title {
                    text-align: center;
                    font-size: 24px;
                    margin-bottom: 20px;
                }
                .account-info, .contract-info {
                    margin-bottom: 15px;
                }
                .highlight {
                    color: red;
                    font-size: larger;
                }
                .button {
                    background-color: #007BFF;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    text-align: center;
                    cursor: pointer;
                    margin-top: 10px;
                }
                .button:hover {
                    background-color: #0056b3;
                }
                .transaction {
                    margin-top: 20px;
                }
                .input {
                    padding: 10px;
                    width: 200px;
                    margin-right: 10px;
                }
                .footer {
                    background-color: #333;
                    color: white;
                    padding: 15px 0;
                    text-align: center;
                }
                `}
            </style>
        </>
    );
}

export default Home;

