var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CinacoinCore } from '@cinacoin/core-sdk';
import { CinacoinService } from './cinacoin.service.js';
import { CINA_CONNECT_OPTIONS, CINA_CONNECT_INSTANCE, } from './cinacoin.tokens.js';
// Components
import { ConnectButtonComponent } from './components/connect-button.component.js';
import { AccountButtonComponent } from './components/account-button.component.js';
import { NetworkButtonComponent } from './components/network-button.component.js';
// Pipes
import { AddressPipe } from './pipes/address.pipe.js';
import { BalancePipe } from './pipes/balance.pipe.js';
// Directives
import { ConnectDirective } from './directives/connect.directive.js';
/**
 * Angular module for Cinacoin.
 *
 * Use `CinacoinModule.forRoot()` in your root `AppModule` to configure
 * the SDK with your project ID and chain list.
 *
 * ```ts
 * @NgModule({
 *   imports: [
 *     CinacoinModule.forRoot({
 *       projectId: 'YOUR_PROJECT_ID',
 *       chains: [mainnet, arbitrum, base],
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
let CinacoinModule = (() => {
    let _classDecorators = [NgModule({
            imports: [CommonModule],
            declarations: [
                ConnectButtonComponent,
                AccountButtonComponent,
                NetworkButtonComponent,
                AddressPipe,
                BalancePipe,
                ConnectDirective,
            ],
            providers: [CinacoinService],
            exports: [
                ConnectButtonComponent,
                AccountButtonComponent,
                NetworkButtonComponent,
                AddressPipe,
                BalancePipe,
                ConnectDirective,
            ],
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var CinacoinModule = _classThis = class {
        /**
         * Configure Cinacoin at the root level.
         *
         * Call this exactly once in your root `AppModule`.
         *
         * @param config - Project configuration including projectId and chains.
         * @returns Module with providers.
         */
        static forRoot(config) {
            return {
                ngModule: CinacoinModule,
                providers: [
                    {
                        provide: CINA_CONNECT_OPTIONS,
                        useValue: config,
                    },
                    {
                        provide: CINA_CONNECT_INSTANCE,
                        useFactory: (options) => {
                            if (options.connector) {
                                return options.connector;
                            }
                            // Create a default connector instance from core SDK
                            const core = new CinacoinCore({
                                projectId: options.projectId,
                                chains: options.chains,
                                metadata: options.metadata,
                                relayUrl: options.relayUrl,
                                debug: options.debug,
                            });
                            return core.getConnector();
                        },
                        deps: [CINA_CONNECT_OPTIONS],
                    },
                ],
            };
        }
    };
    __setFunctionName(_classThis, "CinacoinModule");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        CinacoinModule = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return CinacoinModule = _classThis;
})();
export { CinacoinModule };
//# sourceMappingURL=cinacoin.module.js.mapexport { Eip5792Service } from './eip5792/eip5792.service.js';
