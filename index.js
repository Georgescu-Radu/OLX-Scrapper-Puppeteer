import puppeteer from 'puppeteer'
import Promise from 'bluebird'
const URL = {
  olx: 'https://olx.ro/'
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
  nextPage: 'a[data-cy="pagination-forward"]'
}

const REGEXES = {
  iPhone14ProMax: /^.*iPhone 14 Pro Max.*$/gi,
  viataBaterie: /[^.*Baterie 100%.*$] || [^.*Bateriei 100%.*$] || [^.*100% Baterie.*$] || [^.*Baterie 100.*$] || [^.*Bateriei 100.*$] || [^.*Bat 100%.*$] || [^.*100% Bat.*$] || [^.*Bat 100.*$] || [^.*100 Bat.*$] /gi
};

(async () => {
  const delay = (time) => {
    return new Promise(function (resolve) {
      setTimeout(resolve, time)
    })
  }

  const browser = await puppeteer.launch({ headless: false, args: ['--start-maximized'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 1920, height: 1080 })

  await page.goto(URL.olx)

  await page.click(SELECTORS.acceptCookies)

  await page.type(SELECTORS.searchBar, 'iPhone 14 pro max 100')

  await page.click(SELECTORS.searchButton)

  await delay(2000)

  await page.waitForSelector(SELECTORS.categoryDropDown)

  await page.click(SELECTORS.categoryDropDown)

  await delay(1000)

  await page.hover(SELECTORS.selectedCategory)

  const [button] = await page.$x("//span[contains(., 'Telefoane')]")
  if (button) {
    await button.click()
  };

  await delay(3000)

  await page.click(SELECTORS.priceRangeFrom)

  await page.keyboard.type('4000')

  await page.keyboard.press('Enter')

  await delay(3000)

  await page.click(SELECTORS.sortBy)

  await page.click(SELECTORS.cheap)

  await delay(3000)

  async function getItems () {
    let options = await page.$$eval('div[data-cy="l-card"]', options => {
      return options.filter(option => {
        if (option.querySelectorAll("div[data-testid='adCard-featured']").length) {
          return false
        }
        return true
      }).map(option => {
        return {
          title: option.querySelector('div[data-cy="l-card"] a h6').textContent,
          price: option.querySelector('p[data-testid="ad-price"]').textContent,
          link: option.querySelector('a').href
        }
      })
    }
    )
    options = options.filter(option => {
      if (REGEXES.iPhone14ProMax.test(option.title)) {
        return true
      }
      return false
    })
    return options
  };

  const page2 = await browser.newPage()
  async function checkDescription (itemsArr) {
    await page2.setViewport({ width: 1920, height: 1080 })
    await Promise.each(itemsArr, async (obj) => {
      await page2.goto(obj.link)
      const description = await page2.$eval('div[data-cy="ad_description"] > div', elem => {
        console.log(elem.textContent)
        return elem.textContent
      })
      if (!REGEXES.viataBaterie.test(description)) {
        itemsArr.splice(itemsArr.indexOf(obj), 1)
      } else {
        obj.description = description
      }
    })

    return itemsArr
  }

  const finalItems = []
  while (finalItems.length <= 5) {
    let itemsOnPage = await getItems()

    itemsOnPage = await checkDescription(itemsOnPage)

    if (itemsOnPage.length > 5) {
      itemsOnPage.splice(5)
    }

    finalItems.push(...itemsOnPage)

    await page.bringToFront()

    await page.waitForSelector(SELECTORS.nextPage)

    await page.click(SELECTORS.nextPage)

    await page2.bringToFront()
  }

  console.log(finalItems)

  await browser.close()
})()
