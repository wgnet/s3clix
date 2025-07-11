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

import {InjectionToken} from "@angular/core";

export const APPS_DATA = new InjectionToken<{}>('APPS_DATA');

export interface IService {
    name: string,
    url: string
}

export interface IServiceCatalog {
    name: string,
    description: string,
    service: IService[]
}

export interface IServiceCategory {
    name: string,
    service_catalog: IServiceCatalog[]
}

export interface IAppsCatalog {
    category: IServiceCategory[];
}
