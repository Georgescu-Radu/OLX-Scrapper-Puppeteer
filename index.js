import puppeteer from 'puppeteer'
import Promise from 'bluebird'
// import * as fuzz from 'fuzzball'

const URL = {
  olx: 'https://olx.ro/'
}

const KEYBOARD = {
  priceRange: '4000',
  enter: 'Enter',
  searchText: 'iPhone 14 pro max 100'
}

const SELECTORS = {
  acceptCookies: '#onetrust-accept-btn-handler',
  searchBar: '#headerSearch',
  searchButton: '#submit-searchmain',
  categoryDropDown: 'div[data-cy="category-dropdown"]',
  selectedCategory: "li[data-categoryid='99']",
  priceRangeFrom: "input[placeholder='De la']",
  sortBy: 'div:has(+ svg[data-testid="sorting-icon"])',
  cheap: 'div[data-testid="flyout-content"] div:first-child',
  nextPage: 'a[data-cy="pagination-forward"]',
  itemsOnPage: 'div[data-cy="l-card"]',
  featuredItems: "div[data-testid='adCard-featured']",
  itemTitle: 'div[data-cy="l-card"] a h6',
  itemPrice: 'p[data-testid="ad-price"]',
  itemLink: 'a',
  itemDescription: 'div[data-cy="ad_description"] > div',
  buttonByText: "//span[contains(., 'Telefoane')]"
}

const REGEXES = {
  iPhone14ProMax: /^.*iPhone 14 Pro Max.*$/gi,
  batteryLife: /100%/gi
};

(async () => {
  const browser = await puppeteer.launch({ headless: false, args: ['--start-maximized'], slowMo: 30 })
  const page2 = await browser.newPage()

  const page = await browser.newPage()

  await page2.setViewport({ width: 1920, height: 1080 })

  await page.setViewport({ width: 1920, height: 1080 })

  await page.goto(URL.olx)

  await page.click(SELECTORS.acceptCookies)

  await page.type(SELECTORS.searchBar, KEYBOARD.searchText)

  await page.click(SELECTORS.searchButton)

  await page.waitForSelector(SELECTORS.categoryDropDown)

  await page.click(SELECTORS.categoryDropDown)

  await page.waitForSelector(SELECTORS.selectedCategory)

  await page.hover(SELECTORS.selectedCategory)

  await page.waitForSelector(SELECTORS.selectedCategory)

  const [button] = await page.$x(SELECTORS.buttonByText)
  if (button) {
    await button.click()
  };

  await page.waitForSelector(SELECTORS.priceRangeFrom)

  await page.click(SELECTORS.priceRangeFrom)

  await page.keyboard.type(KEYBOARD.priceRange)

  await page.waitForSelector(SELECTORS.sortBy)

  await page.click(SELECTORS.sortBy)

  await page.waitForSelector(SELECTORS.cheap)

  await page.click(SELECTORS.cheap)

  await page.waitForNavigation({ waitUntil: 'networkidle0' })

  // await page.waitForSelector('button[data-testid="fav-search-btn"]')

  async function getItemsWithoutFeatured () {
    // Selects all items on page
    return page.$$eval(SELECTORS.itemsOnPage, (elem, SELECTORS) => {
      // Removes promoted items
      elem = elem.filter(item => {
        if (item.querySelectorAll(SELECTORS.featuredItems).length) {
          return false
        }
        return true
      })
      // Gets title, price and link of each item
      return elem.map(item => {
        return {
          title: item.querySelector(SELECTORS.itemTitle).textContent,
          price: item.querySelector(SELECTORS.itemPrice).textContent,
          link: item.querySelector(SELECTORS.itemLink).href
        }
      })
    }, SELECTORS)
  }

  // Filters titles to have "iPhone 14 Pro Max" in it
  function filterItemsByTitle (items) {
    return items.filter(item => {
      if (REGEXES.iPhone14ProMax.test(item.title)) {
        return true
      }
      return false
    })
  }

  // Adds description to the item onject and filters for items whith 100% battery health
  async function getDescription (items) {
    const updatedItems = []
    await Promise.each(items, async (obj) => {
      await page2.bringToFront()

      await page2.goto(obj.link, { timeout: 0 })

      await page2.waitForSelector(SELECTORS.itemDescription)

      const description = await page2.$eval(SELECTORS.itemDescription, elem => {
        return elem.textContent
      })
      if (REGEXES.batteryLife.test(description)) {
        obj.description = description
        updatedItems.push(obj)
      }
    })

    return updatedItems
  }

  async function scrapperLogic () {
    await page.bringToFront()

    let itemsOnPage = await getItemsWithoutFeatured()

    itemsOnPage = filterItemsByTitle(itemsOnPage)

    await page.waitForSelector(SELECTORS.nextPage)

    await page.click(SELECTORS.nextPage)

    itemsOnPage = await getDescription(itemsOnPage)

    finalItems.push(...itemsOnPage)

    if (finalItems.length > 4) {
      return finalItems
    } else {
      return scrapperLogic()
    }
  }

  let finalItems = []
  finalItems = await scrapperLogic()

  if (finalItems.length > 5) {
    finalItems.splice(5)
  }
  console.log(finalItems)

  await browser.close()
})()
