# Membrana ERC20

Erc20 Token for Membrana ICO.

## Install and test

```
npm i .
npm run build
npm test
```

## Nonstandard Methods

### mint
```
(address receiver, uint256 amount) -> (bool)
```

Modifiers:
* [notReleasedOnly](#notReleasedOnly)
* [controllerOnly](#controllerOnly)

Mint some `amount` of tokens and transfer it to `receiver`.

### release
```
() -> (bool)
```

Modifiers:
* [notReleasedOnly](#notReleasedOnly)
* [controllerOnly](#controllerOnly)

Release token. Until token released no transfer call will proceed.

### setController
```
(address controller)
```

Modifiers:
* [controllerOnly](#controllerOnly)

Make `controller` a new contract's controller. This role allow to release
the contract.


## Modifiers

### notReleasedOnly

This modifier decline method calls till flag `isReleased` is `false`.

### releasedOnly

This modifier decline method calls till flag `isReleased` is `false`.

### controllerOnly

This modifier allow method calls to `controller` address only.
