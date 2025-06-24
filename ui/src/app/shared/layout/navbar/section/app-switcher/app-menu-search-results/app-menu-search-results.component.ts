/**
 Copyright 2025 Wargaming.Net

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
**/

import {Component, computed, effect, EventEmitter, HostListener, Inject, Optional, Output, signal} from '@angular/core';
import {FormControl} from "@angular/forms";
import {filter, map} from "rxjs/operators";
import {APPS_DATA, IAppsCatalog} from "../../../../interfaces";
import {toSignal} from "@angular/core/rxjs-interop";

@Component({
    selector: 'app-menu-search-results',
    templateUrl: './app-menu-search-results.component.html',
    styleUrls: ['./app-menu-search-results.component.scss'],
    standalone: false
})
export class AppMenuSearchResultsComponent {

    @Output()
    searching = new EventEmitter();

    searchFormControl = new FormControl();

    appsCatalogFlatten = signal<any[]>([]);

    searchEvent = toSignal(this.searchFormControl.valueChanges.pipe(filter(search => !!search.trim())));

    searchResults = computed(() => {
        const search = this.searchEvent().trim().toLowerCase();
        return this.appsCatalogFlatten().filter(record => {
            return record.instanceName.toLowerCase().includes(search) ||
                record.serviceName.toLowerCase().includes(search) ||
                record.categoryName.toLowerCase().includes(search);
        });
    });


    selectedIndex = 0;

    @HostListener('keyup', ['$event'])
    onKeyDown(event: KeyboardEvent) {
        switch (event.code) {
            case 'ArrowUp': {
                this.shiftSelectedIndex(-1);
                break;
            }
            case 'ArrowDown': {
                this.shiftSelectedIndex(1);
                break;
            }
            case 'Enter': {
                this.goToSelectedInstance();
                break;
            }
        }
    }

    constructor(@Optional() @Inject(APPS_DATA) private appsCatalog: IAppsCatalog) {
        this.flattenAppCatalog();

        effect(() => {
            this.searchEvent();
            this.selectedIndex = 0;
        });

        this.searchFormControl.valueChanges.pipe(
            map(search => !!search.trim())
        ).subscribe(isSearching => {
            this.searching.emit(isSearching);
        });
    }

    private flattenAppCatalog() {
        const flatten = this.appsCatalog.category.reduce((categoryAcc, category) => {
            const flattenCategory = category.service_catalog.reduce((serviceAcc, service) => {
                const flatterService = service.service.map(instance => {
                    return {
                        categoryName: category.name,
                        instanceName: instance.name,
                        instanceURL: instance.url,
                        serviceName: service.name,
                        serviceDescription: service.description
                    };
                });
                return serviceAcc.concat(flatterService);
            }, [] as any[]);

            return categoryAcc.concat(flattenCategory);
        }, [] as any[]);
        this.appsCatalogFlatten.set(flatten);
    }

    private shiftSelectedIndex(step: number) {
        const searchResultsLength = this.searchResults().length;
        if (this.selectedIndex + step >= 0 && this.selectedIndex + step < searchResultsLength) {
            this.selectedIndex += step;
        }
    }

    private goToSelectedInstance() {
        if (!!this.searchResults().length) {
            const selectedItem = this.searchResults()[this.selectedIndex];
            window.location.href = selectedItem.instanceURL;
        }
    }
}
