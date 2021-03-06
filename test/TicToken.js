var TicToken = artifacts.require("./TicToken.sol");

contract("TicToken", function(accounts) 
{
    var tokenInstance;

    it('initialized the contract with the correct values', function() {
        return TicToken.deployed().then(function(instance) {
            tokenInstance = instance;
            return tokenInstance.name();
        }).then(function(name) {
            assert.equal(name, 'TicToken', 'has the correct name');
            return tokenInstance.symbol();
        }).then(function(symbol) {
            assert.equal(symbol, 'TTO', 'has the correct symbol');
            return tokenInstance.standard();
        }).then(function(standard) {
            assert.equal(standard, 'TicToken version 1.0', 'has the correct standard');
        });
    });

    it('allocates the initial supply upon deployment', function() {
        return TicToken.deployed().then(function(instance) {
            tokenInstance = instance;
            return tokenInstance.totalSupply();
        }).then(function(totalSupply) {
            assert.equal(totalSupply.toNumber(), 1000000, 'sets the total supply to 1000000');
            return tokenInstance.balanceOf(accounts[0]);
        }).then(function(adminBalance) {
            assert.equal(adminBalance.toNumber(), 1000000, 'it allocates the initial supply to the admin account')
        });
    });

    it('transfers token ownership',function() {
        return TicToken.deployed().then(function(instance) {
            tokenInstance = instance;
            //Test 'require' statement first by transferring some amount larger than the sender's account balance
            return tokenInstance.transfer.call(accounts[1], 9999999);
        }).then(assert.fail).catch(function(error) {
            assert(error.message.indexOf('revert') >= 0, 'error message must contain revert');
            return tokenInstance.transfer.call(accounts[1], 25000);
        }).then(function(success) {
            assert.equal(success, true, 'returns true');
            return tokenInstance.transfer(accounts[1], 250000, { from: accounts[0] }); // admin balance : 750000
        }).then(function(receipt) {
            assert.equal(receipt.logs.length, 1, 'triggers one event');
            assert.equal(receipt.logs[0].event, 'Transfer', 'should be the "Transfer" event');
            assert.equal(receipt.logs[0].args._from, accounts[0], 'logs the account the transfer is made from');
            assert.equal(receipt.logs[0].args._to, accounts[1], 'logs the account the transfer is made to');
            assert.equal(receipt.logs[0].args._value, 250000, 'logs the transfer amount');

            var balanceins = tokenInstance.balanceOf(accounts[0]);
            return balanceins;
        }).then(function(balanceins){
            //console.log('admin balance 111111 : '+balanceins.toNumber()); // admin balance : 750000
            return tokenInstance.balanceOf(accounts[1]);
        }).then(function(balance) {
            assert.equal(balance, 250000, 'adds the amount to the receiving account.');
            return tokenInstance.balanceOf(accounts[0]);
        }).then(function(balance) {
            assert.equal(balance, 1000000 - 250000, 'substracts the amount from the sending account');
        });
    });

    it('approves tokens for delegated transfer', function() {
        return TicToken.deployed().then(function(instance) {
            tokenInstance = instance;
            return tokenInstance.approve.call(accounts[1], 100);
        }).then(function(success) {
            assert.equal(success, true, 'it returns true');
            return tokenInstance.approve(accounts[1], 100, { from: accounts[0] });
        }).then(function(receipt) {
            assert.equal(receipt.logs.length, 1, 'triggers one event');
            assert.equal(receipt.logs[0].event, 'Approval', 'should be the "Approval" event');
            assert.equal(receipt.logs[0].args._owner, accounts[0], 'logs the account the approval is authorized from');
            assert.equal(receipt.logs[0].args._spender, accounts[1], 'logs the account the approval is authorized to');
            assert.equal(receipt.logs[0].args._value, 100, 'logs the allowance amount');
            var balanceins = tokenInstance.balanceOf(accounts[0]);
            return balanceins;
        }).then(function(balanceins){
            //console.log('admin balance 22222 : '+balanceins.toNumber()); // admin balance : 750000
            return tokenInstance.allowance(accounts[0], accounts[1]);
        }).then(function(allowance) {
            assert.equal(allowance, 100, 'stores the allowance for delegated transfer');
        })
    });

    var fromAccount, toAccount, spendingAccount;
    it('handles delegated transfer', function() {
        return TicToken.deployed().then(function(instance) {
            tokenInstance = instance;
            fromAccount = accounts[2];
            toAccount = accounts[3];
            spendingAccount = accounts[4];
            //Transfer some tokens to fromAccount
            return tokenInstance.transfer(fromAccount, 100, { from: accounts[0] });
        }).then(function(receipt) {
            var balanceins = tokenInstance.balanceOf(accounts[0]);
            return balanceins;
        }).then(function(balanceins){
            //console.log('admin balance 33333 : '+balanceins.toNumber()); // admin balance : 749900
            //Approve spendingAccount to spent 10 tokens from fromAccount
            return tokenInstance.approve(spendingAccount, 10, { from: fromAccount });
        }).then(function(receipt) {
            //Try transferring something larger that the sender's balance
            return tokenInstance.transferFrom(fromAccount, toAccount, 9999, { from: spendingAccount })
        }).then(assert.fail).catch(function(error) {
            assert(error.message.indexOf('revert') >= 0, 'cannot transfer value larger than the balance');
            return tokenInstance.transferFrom(fromAccount, toAccount, 20, { from: spendingAccount });
        }).then(assert.fail).catch(function(error) {
            assert(error.message.indexOf('revert') >= 0, 'cannot transfer value larger than the allowance');
            return tokenInstance.transferFrom.call(fromAccount, toAccount, 10, { from: spendingAccount });
        }).then(function(success){
            assert.equal(success,true, 'returns true');
            return tokenInstance.transferFrom(fromAccount, toAccount, 10, { from: spendingAccount });
        }).then(function(receipt) {
            assert.equal(receipt.logs.length, 1, 'triggers one event');
            assert.equal(receipt.logs[0].event, 'Transfer', 'should be the "Transfer" event');
            assert.equal(receipt.logs[0].args._from, fromAccount, 'logs the account the transfer is made from');
            assert.equal(receipt.logs[0].args._to, toAccount, 'logs the account the transfer is made to');
            assert.equal(receipt.logs[0].args._value, 10, 'logs the transfer amount');
            return tokenInstance.balanceOf(fromAccount);
        }).then(function(balance) {
            assert.equal(balance.toNumber(), 90, 'deducts the transferred amount from the sender');
            return tokenInstance.balanceOf(toAccount);
        }).then(function(balance) {
            assert.equal(balance.toNumber(), 10, 'adds the transferred amount to the receiver');
            return tokenInstance.allowance(fromAccount, spendingAccount);
        }).then(function(allowance) {
            assert.equal(allowance, 0, 'deducts the amount from the allowance');
        });
    });
});