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

import {Component, OnInit} from '@angular/core';
import {NavigationEnd, Router} from "@angular/router";
import {filter} from "rxjs";

@Component({
    selector: 'app-breadcrumbs',
    templateUrl: './breadcrumbs.component.html',
    styleUrls: ['./breadcrumbs.component.scss'],
    standalone: false
})
export class BreadcrumbsComponent implements OnInit {
    urlSegments: string[] = [];

    constructor(private router: Router) {
    }

    ngOnInit() {
        this.router.events
            .pipe(
                filter(event => event instanceof NavigationEnd)
            )
            .subscribe(event => {
                this.urlSegments = decodeURIComponent((event as NavigationEnd).url).split(/(\?file=|\?bucket=)/)[0].split('/').filter(element => !!element);
            });
    }

    handleSelectedPage(i: number) {
        const path = this.urlSegments.slice(0, i + 1);
        this.router.navigate([''].concat(path));
    }
}
