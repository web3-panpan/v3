// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol"; 
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20FlashMint.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";



contract VotingContract is ReentrancyGuard,  Pausable,Ownable{

    using SafeMath for uint256;  // 使用SafeMath库来避免溢出
    uint256 constant MAX_UINT256 = type(uint256).max;
    address public myToken;  // 用于投票的代币地址
    using Counters for Counters.Counter;
    Counters.Counter private _proposalIds;

    constructor(address _myToken) {
        myToken = _myToken;
    }

    event Received(address caller, uint amount, string message);
    event Deposited(address indexed user, uint amount);
    event Withdrawn(address indexed user, uint amount);
    event Voted(address indexed _address, uint256 indexed _proposalId, uint256 indexed _optionId, uint256 _amount);
    event ProposalAndOptionsSubmitted(address indexed user, uint256 indexed proposalIndex, string proposalDescription, string[] optionDescriptions);
    event DepositForProposal(address indexed staker, uint256 amount, bool staked, uint256 unlockTime, uint256 indexed stakeIndex);
    event TokensStaked(address indexed user, uint256 amount, bool isForProposal);
    event FundsSettledForAverageQuality(uint256 indexed proposalId, address indexed proposer, uint256 amountToReturn);
    event WithdrawalDetailed(address indexed user, uint256 amountWithdrawn, uint256 balanceAfterWithdrawal, uint256 lockedAmount);
    event UnlockTimeUpdated(address indexed staker, uint256 indexed stakeIndex, uint256 newUnlockTime);
    event FundsPenalizedForNonCompliance(uint256 indexed proposalId, address indexed proposer, uint256 penalty);
    event ProposalStatusChanged(uint256 proposalId, bool isActive);
    event ProposalEndTime(uint256 _proposalId, uint256 endTime);
    event ProposalForUser(address indexed userAddress, uint256 indexed proposalId, string proposalDescription, uint256 stakeAmount, string[] optionDescriptions);

    mapping(uint256 => uint256) public votingEndTimes;  // 投票结束时间
    mapping(address => uint256) public balances;

    // 提案
    struct Proposal {
        address proposer; // 提案发起人
        string description; // 提案描述
        uint256 stakeAmount; // 质押代币数量
        bool active; // 提案是否活跃
        bool isSettled; // 添加属性以跟踪提案是否已结算
    }
    // 提议选项
    struct Option {
        string description; // 选项描述
        uint256 voteCount; // 投票计数
        // ...其他属性
    }

    struct Stake {
        uint256 amount;      // 质押的金额
        uint256 unlockTime;  // 资金解锁的时间
        uint256 proposalId;  // 提案ID
        address staker;      // 质押者地址
    }

    struct VoteRecord {
        uint256 proposalId; // 提案ID
        uint256 optionId;   // 用户选择的选项ID
        uint256 amount;     // 投票数量
    }

    mapping(address => VoteRecord[]) public userVotingHistory;    // 用户的投票历史记录映射
    mapping(address => Stake[]) public stakesForUser;
    Proposal[] public proposals; // 提案数组
    mapping(uint256 => Option[]) public proposalOptions; // 提案ID到选项数组的映射

    mapping(address => mapping(uint256 => bool)) public voters;
    mapping(address => uint256) public usedVotingRights;
    mapping(address => mapping(uint256 => uint256)) public votingRecords;


    // 常规质押代币
    function deposit(uint256 amount) public {
        require(
            IERC20(myToken).transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
        balances[msg.sender] = balances[msg.sender].add(amount);
        emit Deposited(msg.sender, amount);
    }

    // stakeTokensForProposal 
    function stakeTokensForProposal(uint256 _amount) public returns (uint256) {
        require(_amount > 0, "Amount must be greater than 0");

        require(
            IERC20(myToken).transferFrom(msg.sender, address(this), _amount),
            "Transfer failed"
        );
        balances[msg.sender] = balances[msg.sender].add(_amount);

        // 设定解锁时间，这里我们设定为当前时间加上一个常数（例如7天）
        uint256 unlockTime = block.timestamp + 7 days;

        // 创建新的Stake实例并存储在stakes数组中
        uint256 stakeIndex = stakesForUser[msg.sender].length;
        stakesForUser[msg.sender].push(Stake({
            amount: _amount,
            unlockTime: unlockTime,
            staker: msg.sender,
            proposalId: MAX_UINT256 // 初始设置为无效值， 我写的是最大值
        }));

        // 触发事件
        emit DepositForProposal(msg.sender, _amount, true, unlockTime, stakeIndex);
        return stakeIndex; // 返回新创建的质押索引， 用于标记。。。 不等于提案id
    }

    function createProposalWithOptions(
        string memory proposalDescription,
        string[] memory optionDescriptions
    ) public onlyOwner {

        // 创建提案
        uint256 proposalId = _proposalIds.current(); // 获取新的提案ID
        _proposalIds.increment(); // 增加提案ID
        
        proposals.push(Proposal({
            proposer: msg.sender,
            description: proposalDescription,
            stakeAmount: 0,
            active: true,
            isSettled: false
        }));

        // 为提案添加选项
        for (uint i = 0; i < optionDescriptions.length; i++) {
            proposalOptions[proposalId].push(Option({
                description: optionDescriptions[i],
                voteCount: 0
            }));
        }
        // 触发事件
        emit ProposalAndOptionsSubmitted(msg.sender, proposalId, proposalDescription, optionDescriptions);
    }

    function processUserStakedProposal(
        address userAddress,
        string memory proposalDescription,
        uint256 stakeAmount,
        string[] memory optionDescriptions,
        uint256 stakeIndex
    ) public onlyOwner {
        Stake storage userStake = stakesForUser[userAddress][stakeIndex];
        require(userStake.amount == stakeAmount, "Staked amount does not match or insufficient");
        require(userStake.unlockTime > block.timestamp, "Stake is already unlocked");
        require(userStake.proposalId == MAX_UINT256, "Stake is already linked to a proposal");

        uint256 proposalId = _proposalIds.current(); // 获取新的提案ID
        _proposalIds.increment(); // 增加提案ID

        proposals.push(Proposal({
            proposer: userAddress,
            description: proposalDescription,
            stakeAmount: stakeAmount,
            active: true,
            isSettled: false
        }));

        userStake.proposalId = proposalId; // 关联质押到新的提案ID

        for (uint256 i = 0; i < optionDescriptions.length; i++) {
            proposalOptions[proposalId].push(Option({
                description: optionDescriptions[i],
                voteCount: 0
            }));
        }

        emit ProposalForUser(userAddress, proposalId, proposalDescription, stakeAmount, optionDescriptions);
    }

    function withdraw(uint256 _amount) public nonReentrant {
        // 计算可提现的余额，不包括已用于投票的代币和仍然锁定的质押
        uint256 availableAmount = balances[msg.sender].sub(usedVotingRights[msg.sender]);
        uint256 lockedAmount = 0;

        // 计算所有锁定的质押总额
        for (uint256 i = 0; i < stakesForUser[msg.sender].length; i++) {
            Stake memory stake = stakesForUser[msg.sender][i];
            // 确保提案ID在proposals数组范围内
            if (stake.proposalId < proposals.length) {
                // 如果质押未解锁且提案活跃，加入锁定总额
                if (stake.unlockTime > block.timestamp && proposals[stake.proposalId].active) {
                    lockedAmount = lockedAmount.add(stake.amount);
                }
            }
        }
        // 确保提款后余额不会低于锁定金额
        require(availableAmount.sub(lockedAmount) >= _amount, "Not enough available balance to withdraw");

        // 在余额更新前执行转账
        require(IERC20(myToken).transfer(msg.sender, _amount), "Transfer failed");

        // 更新余额
        balances[msg.sender] = balances[msg.sender].sub(_amount);

        // 触发提款事件
        emit WithdrawalDetailed(msg.sender, _amount, balances[msg.sender], lockedAmount);
    }


    function getAvailableWithdrawBalance(address user) public view returns (uint256) {
        uint256 totalBalance = balances[user];
        uint256 usedForVoting = usedVotingRights[user];
        uint256 lockedStake = 0;

        // 计算锁定的质押总额
        uint256 stakeCount = stakesForUser[user].length;
        for (uint256 i = 0; i < stakeCount; i++) {
            Stake memory stake = stakesForUser[user][i];
            // 确保提案ID在proposals数组范围内
            if (stake.proposalId < proposals.length) {
                if (stake.unlockTime > block.timestamp && proposals[stake.proposalId].active) {
                    lockedStake += stake.amount;
                }
            }
        }

        // 计算可提现余额
        uint256 availableBalance = totalBalance.sub(usedForVoting).sub(lockedStake);
        return availableBalance;
    }


    function SetProposalStatus(uint256 _proposalId, bool _isActive) public onlyOwner {
        Proposal storage proposal = proposals[_proposalId];
        proposal.active = _isActive;
        emit ProposalStatusChanged(_proposalId, _isActive);
    }

    // 检查某个地址是否已经对某个提案投过票   
    function hasVoted(address voter, uint256 _proposalId) public view returns (bool) {
        return voters[voter][_proposalId];
    }

    // 设置提案的投票结束时间
    function setUnlockTimeForStake(address _staker, uint256 _stakeIndex, uint256 _newUnlockTime) public onlyOwner {
        require(_stakeIndex < stakesForUser[_staker].length, "Stake index out of bounds");
        require(_newUnlockTime >= block.timestamp, "New unlock time must be in the future");

        // 更新质押的解锁时间
        // stakesForUser[_staker][_stakeIndex].unlockTime = _newUnlockTime;
        stakesForUser[_staker][_stakeIndex].unlockTime =  block.timestamp + 1;

        // 触发一个事件来记录更新的解锁时间
        emit UnlockTimeUpdated(_staker, _stakeIndex, _newUnlockTime);
    }

    function setTime(uint256 _time) public onlyOwner view returns(uint256 ){
        uint256 end_time = block.timestamp + _time;
        return end_time;
    }

    // 投票
    function vote(uint256 _proposalId, uint256 _optionId, uint256 _amount) public whenNotPaused{
        require(_proposalId < proposals.length, "The proposal does not exist");
        require(_optionId < proposalOptions[_proposalId].length, "The option does not exist");
        
        uint256 remainingVotingRights = balances[msg.sender].sub(usedVotingRights[msg.sender]);
        require(remainingVotingRights >= _amount, "Insufficient voting rights");

        usedVotingRights[msg.sender] = usedVotingRights[msg.sender].add(_amount);
        proposalOptions[_proposalId][_optionId].voteCount = proposalOptions[_proposalId][_optionId].voteCount.add(_amount);
        votingRecords[msg.sender][_proposalId] = votingRecords[msg.sender][_proposalId].add(_amount);
        voters[msg.sender][_proposalId] = true;
        userVotingHistory[msg.sender].push(VoteRecord(_proposalId, _optionId, _amount));
        emit Voted(msg.sender, _proposalId, _optionId, _amount);
    }

    // Get the balance of the contract itself in MyToken
    function getContractBalance() public view returns (uint) {
        return IERC20(myToken).balanceOf(address(this));
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function settleFundsForAverageQuality(uint256 _proposalId) public onlyOwner {
        require(_proposalId < proposals.length, "Proposal does not exist.");
        Proposal storage proposal = proposals[_proposalId];
        require(!proposal.active, "Proposal is still active.");
        require(!proposal.isSettled, "Funds already settled");

        uint256 serviceFee = proposal.stakeAmount.mul(3).div(100); // 计算3%的服务费
        uint256 reward = proposal.stakeAmount.mul(5).div(100); // 计算5%的奖励
        uint256 profit = reward - serviceFee; 

        // 更新余额而不实际转账
        balances[proposal.proposer] = balances[proposal.proposer].add(profit);

        // 更新提案状态
        proposal.active = false;
        proposal.isSettled = true;

        // 触发结算事件
        emit FundsSettledForAverageQuality(_proposalId, proposal.proposer, profit);
    }

    function verifyComplianceAndExpectations(uint256 _proposalId) public onlyOwner {
        require(_proposalId < proposals.length, "Proposal does not exist.");
        Proposal storage proposal = proposals[_proposalId];
        require(!proposal.active, "Proposal is still active.");
        require(!proposal.isSettled, "Funds already settled");

        uint256 serviceFee = proposal.stakeAmount.mul(3).div(100); // 计算3%的服务费
        uint256 reward = proposal.stakeAmount.mul(10).div(100); // 计算5%的奖励
        uint256 profit = reward - serviceFee; 

        // 更新余额而不实际转账
        balances[proposal.proposer] = balances[proposal.proposer].add(profit);

        // 更新提案状态
        proposal.active = false;
        proposal.isSettled = true;

        // 触发结算事件
        emit FundsSettledForAverageQuality(_proposalId, proposal.proposer, profit);
    }

    function checkQualityComplianceBelowExpectations(uint256 _proposalId) public onlyOwner {
        require(_proposalId < proposals.length, "Proposal does not exist.");
        Proposal storage proposal = proposals[_proposalId];
        require(!proposal.active, "Proposal is still active.");
        require(!proposal.isSettled, "Funds already settled");

        uint256 punishment = proposal.stakeAmount.mul(5).div(100); // 计算5%的奖励

        // 更新余额而不实际转账
        balances[proposal.proposer] = balances[proposal.proposer].sub(punishment);

        // 更新提案状态
        proposal.active = false;
        proposal.isSettled = true;

        // 触发结算事件
        emit FundsPenalizedForNonCompliance(_proposalId, proposal.proposer, punishment);
    }

    function setUnlockTimeForStake(uint256 _stakeIndex, address _staker, uint256 _newUnlockTime) public onlyOwner {
        require(_stakeIndex < stakesForUser[_staker].length, "Stake index out of bounds");
        require(_newUnlockTime >= block.timestamp, "New unlock time must be in the future");

        // 更新质押的解锁时间
        stakesForUser[_staker][_stakeIndex].unlockTime = _newUnlockTime;

        // 触发一个事件来记录更新的解锁时间
        emit UnlockTimeUpdated(_staker, _stakeIndex, _newUnlockTime);
    }

    function getUserVotingHistory(address _user)
        public
        view
        returns (
            uint256[] memory proposalIds,
            uint256[] memory optionIds,
            uint256[] memory amounts
        )
    {
        VoteRecord[] storage records = userVotingHistory[_user];
        proposalIds = new uint256[](records.length);
        optionIds = new uint256[](records.length);
        amounts = new uint256[](records.length);

        for (uint256 i = 0; i < records.length; i++) {
            proposalIds[i] = records[i].proposalId;
            optionIds[i] = records[i].optionId;
            amounts[i] = records[i].amount;
        }
    }

    function proposalsLength() public view returns (uint256) {
        return proposals.length;
    }

    function getOptionsCount(uint256 proposalId) public view returns (uint256) {
        return proposalOptions[proposalId].length;
    }

    function getOptionVoteCount(uint256 proposalId, uint256 optionIndex) public view returns (uint256) {
        require(proposalId < proposalsLength(), "Proposal does not exist.");
        require(optionIndex < proposalOptions[proposalId].length, "Option does not exist.");
        return proposalOptions[proposalId][optionIndex].voteCount;
    }

    function getProposalStatus(uint256 _proposalId) view public returns(bool){
        Proposal storage proposal = proposals[_proposalId];
        return proposal.active;
    }

    function getLastStakeIndex(address user) public view returns (uint256) {
        return stakesForUser[user].length > 0 ? stakesForUser[user].length - 1 : 0;
    }

    function getCurrentProposalId() public view returns (uint256) {
        uint256 proposalArrayLength = proposals.length;
        uint256 currentCounterValue = _proposalIds.current();

        if (proposalArrayLength == currentCounterValue) {
            // 如果数组长度和计数器的值相等，返回当前的提案ID
            return currentCounterValue - 1;
        } else {
            // 如果不相等，可以返回一个错误标识或默认值
            return MAX_UINT256; // 例如返回一个最大值表示错误
        }
}   

}


