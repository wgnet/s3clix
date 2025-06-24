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

import {Component} from '@angular/core';
import {Router} from "@angular/router";

@Component({
    selector: 'k8s-not-found-page',
    templateUrl: './not-found-page.component.html',
    styleUrls: ['./not-found-page.component.scss'],
    standalone: false
})
export class NotFoundPageComponent {

    constructor(private router: Router) {
    }


    goHome() {
        this.router.navigate(['/']);
    }
}
