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

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppMenuSearchResultsComponent } from './app-menu-search-results.component';

describe('AppMenuSearchResultsComponent', () => {
  let component: AppMenuSearchResultsComponent;
  let fixture: ComponentFixture<AppMenuSearchResultsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AppMenuSearchResultsComponent]
    });
    fixture = TestBed.createComponent(AppMenuSearchResultsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
