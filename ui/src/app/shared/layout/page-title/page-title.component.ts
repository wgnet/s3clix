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

import {AfterViewInit, Component, OnDestroy, ViewChild} from '@angular/core';
import {CdkPortal} from "@angular/cdk/portal";
import {PageTitleService} from "./page-title.service";

@Component({
    selector: 'page-title',
    templateUrl: './page-title.component.html',
    styleUrls: ['./page-title.component.scss'],
    standalone: false
})
export class PageTitleComponent implements AfterViewInit, OnDestroy {

    @ViewChild(CdkPortal) portal!: CdkPortal;

    constructor(private titleService: PageTitleService) {
    }

    ngAfterViewInit(): void {
        this.titleService.setPortal(this.portal);
    }

    ngOnDestroy() {
        this.titleService.setPortal(null);
    }

}
